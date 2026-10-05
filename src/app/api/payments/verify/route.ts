import { after } from 'next/server'
import { z } from 'zod'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { requireViewer } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyTransfer } from '@/lib/solana/verify'
import { fetchTransaction } from '@/lib/solana/connection'
import { notifyPayment } from '@/lib/notify'
import type { PaymentIntent } from '@/lib/types'

export const dynamic = 'force-dynamic'
/** RPC round trips plus a retry can outlast the default budget on Vercel's Hobby tier. */
export const maxDuration = 30

const schema = z.object({
  intent_id: z.string().uuid(),
  signature: z.string().trim().min(64).max(120),
})

/** Grace after the lock expires during which a landed transfer is still auto-accepted. */
const LATE_GRACE_SECONDS = 300

export type VerifyOutcome =
  | 'paid'
  | 'pending_confirmation'
  | 'failed'
  | 'mismatch'
  | 'needs_review'
  | 'already_paid'

/**
 * The gate to `paid`.
 *
 * The client hands over a signature and nothing else of consequence. Everything the
 * transfer is checked against, recipient, mint, amount and payer, is read from the
 * stored intent, and the credit itself is read from the ledger. A member who edits
 * the request body, replays someone else's signature or fakes a client-side success
 * gets nothing.
 */
export async function POST(request: Request) {
  try {
    const viewer = await requireViewer()

    const parsed = schema.safeParse(await readJson<unknown>(request))
    if (!parsed.success) return fail('A payment intent and a transaction signature are required.', 422)
    const { intent_id, signature } = parsed.data

    const db = supabaseAdmin()

    const intentRow = await db
      .from('payment_intents')
      .select(
        'id, request_id, quote_id, token, amount, amount_usd, sol_price_usd, recipient, mint, status, expires_at, created_at',
      )
      .eq('id', intent_id)
      .maybeSingle()

    if (intentRow.error) throw new Error(intentRow.error.message)
    if (!intentRow.data) return fail('That payment session no longer exists. Reopen the quote.', 404)
    const intent = intentRow.data as PaymentIntent

    // Ownership: the intent's request must belong to the caller.
    const booking = await db
      .from('booking_requests')
      .select('id, user_id, status')
      .eq('id', intent.request_id)
      .eq('user_id', viewer.id)
      .maybeSingle()

    if (booking.error) throw new Error(booking.error.message)
    if (!booking.data) return fail('That payment does not belong to your account.', 403)

    // --- idempotency and replay -------------------------------------------
    const existing = await db
      .from('payments')
      .select('id, request_id, tx_signature, token, amount, confirmed_at')
      .eq('tx_signature', signature)
      .maybeSingle()

    if (existing.error) throw new Error(existing.error.message)
    if (existing.data) {
      if (existing.data.request_id !== intent.request_id) {
        // The same transfer cannot settle two bookings.
        return fail('That transaction has already been used to settle a different booking.', 409, {
          outcome: 'mismatch' satisfies VerifyOutcome,
        })
      }
      return ok({
        outcome: 'already_paid' satisfies VerifyOutcome,
        payment: existing.data,
        message: 'This payment was already confirmed.',
      })
    }

    if (booking.data.status === 'paid' || booking.data.status === 'fulfilled') {
      return ok({
        outcome: 'already_paid' satisfies VerifyOutcome,
        message: 'This booking is already settled.',
      })
    }

    // --- on-chain truth ---------------------------------------------------
    const result = await verifyTransfer(
      {
        signature,
        recipient: intent.recipient,
        token: intent.token,
        expectedAmount: Number(intent.amount),
        mint: intent.mint,
        expectedPayer: viewer.wallet_address,
        // The transfer cannot predate the lock by more than a minute of clock skew.
        notBefore: Math.floor(Date.parse(intent.created_at) / 1000) - 60,
      },
      { getTransaction: fetchTransaction },
    )

    if (result.status === 'not_found') {
      return ok({
        outcome: 'pending_confirmation' satisfies VerifyOutcome,
        message: result.reason,
      })
    }
    if (result.status === 'failed') {
      return fail(result.reason, 402, { outcome: 'failed' satisfies VerifyOutcome })
    }
    if (result.status === 'mismatch') {
      return fail(result.reason, 422, { outcome: 'mismatch' satisfies VerifyOutcome })
    }

    // --- the transfer is real --------------------------------------------
    // Landing after the lock expired is not the member's fault and the funds have
    // moved, so we always record it. Well past the grace window it goes to the desk
    // for reconciliation rather than auto-confirming against a stale rate.
    const lockDeadline = Date.parse(intent.expires_at) / 1000 + LATE_GRACE_SECONDS
    const late = result.blockTime !== null && result.blockTime > lockDeadline

    const recorded = await db
      .from('payments')
      .insert({
        request_id: intent.request_id,
        intent_id: intent.id,
        tx_signature: signature,
        token: intent.token,
        amount: result.observedAmount,
        payer: result.payer,
        slot: result.slot,
        confirmed_at: result.blockTime ? new Date(result.blockTime * 1000).toISOString() : new Date().toISOString(),
      })
      .select('id, request_id, tx_signature, token, amount, payer, slot, confirmed_at')
      .single()

    if (recorded.error) {
      // Two tabs verifying the same signature: the unique index is the arbiter.
      if (recorded.error.code === '23505') {
        return ok({
          outcome: 'already_paid' satisfies VerifyOutcome,
          message: 'This payment was already confirmed.',
        })
      }
      throw new Error(recorded.error.message)
    }

    await db.from('payment_intents').update({ status: 'consumed' }).eq('id', intent.id)

    after(() =>
      notifyPayment({
        requestId: intent.request_id,
        token: intent.token,
        amount: result.observedAmount,
        amountUsd: intent.amount_usd,
        signature,
        late,
      }),
    )

    if (late) {
      console.warn('[solcierge] payment landed outside its rate lock', { intent: intent.id, signature })
      return ok({
        outcome: 'needs_review' satisfies VerifyOutcome,
        payment: recorded.data,
        message:
          'We can see your transfer on chain, but it landed after the rate lock expired. The desk will reconcile it and confirm with you, nothing further is needed from you.',
      })
    }

    const moved = await db
      .from('booking_requests')
      .update({ status: 'paid' })
      .eq('id', intent.request_id)
      .eq('user_id', viewer.id)

    if (moved.error) throw new Error(moved.error.message)

    return ok({
      outcome: 'paid' satisfies VerifyOutcome,
      payment: recorded.data,
      message: 'Payment confirmed on chain.',
    })
  } catch (error) {
    return handleError(error)
  }
}

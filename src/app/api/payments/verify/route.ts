import { after } from 'next/server'
import { z } from 'zod'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { requireViewer } from '@/lib/auth'
import { getRequest } from '@/lib/data'
import { decideSettlement, duplicateOutcome } from '@/lib/payments/settlement'
import { createLimiter } from '@/lib/ratelimit'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyTransfer } from '@/lib/solana/verify'
import { fetchTransaction } from '@/lib/solana/connection'
import { notifyMemberPassengersNeeded, notifyPayment } from '@/lib/notify'
import type { PaymentIntent } from '@/lib/types'

export const dynamic = 'force-dynamic'
/** RPC round trips plus a retry can outlast the default budget on Vercel's Hobby tier. */
export const maxDuration = 30

const schema = z.object({
  intent_id: z.string().uuid(),
  signature: z.string().trim().min(64).max(120),
})

// Per instance (SA-17). Each call is an RPC getTransaction; the pay panel polls up
// to 20 times per payment.
const perMember = createLimiter({ limit: 60, windowMs: 60_000 })

const NEEDS_REVIEW_MESSAGE =
  'We can see your transfer on chain, but it does not match the live quote and rate lock, so the desk will reconcile it and confirm with you. Nothing further is needed from you.'

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
    // The payer check below binds the transfer to this wallet. Without one, any
    // transfer to the treasury would settle the booking (SA-03).
    const payer = viewer.wallet_address
    if (!payer) return fail('Connect and sign in with the wallet you paid from.', 403)
    if (!perMember.take(viewer.id)) return fail('Too many checks in a minute. Wait a moment and try again.', 429)

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

    // Ownership: the intent's request must belong to the caller. This also loads the
    // booking's status and newest quote, which decide whether a proven transfer may
    // settle it automatically.
    const booking = await getRequest(intent.request_id, viewer.id)
    if (!booking) return fail('That payment does not belong to your account.', 403)

    // --- idempotency and replay -------------------------------------------
    const existing = await db
      .from('payments')
      .select('id, request_id, tx_signature, token, amount, confirmed_at')
      .eq('tx_signature', signature)
      .maybeSingle()

    if (existing.error) throw new Error(existing.error.message)
    if (existing.data) {
      if (duplicateOutcome(existing.data.request_id, intent.request_id) === 'mismatch') {
        // The same transfer cannot settle two bookings.
        return fail('That transaction has already been used to settle a different booking.', 409, {
          outcome: 'mismatch' satisfies VerifyOutcome,
        })
      }
      // Recorded before, but only settled if the booking actually moved to paid; a
      // transfer that went to review must keep saying so when it is re-submitted.
      if (booking.status !== 'paid' && booking.status !== 'fulfilled') {
        return ok({
          outcome: 'needs_review' satisfies VerifyOutcome,
          payment: existing.data,
          message: NEEDS_REVIEW_MESSAGE,
        })
      }
      return ok({
        outcome: 'already_paid' satisfies VerifyOutcome,
        payment: existing.data,
        message: 'This payment was already confirmed.',
      })
    }

    if (booking.status === 'paid' || booking.status === 'fulfilled') {
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
        expectedPayer: payer,
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
    // The funds have moved, so the payment is always recorded. It settles the booking
    // automatically only against the live lock on the live quote of a booking still
    // waiting for payment; anything else (a late landing, a superseded lock, a
    // cancelled booking) goes to the desk with the reason.
    const settlement = decideSettlement({
      bookingStatus: booking.status,
      intentStatus: intent.status,
      intentQuoteId: intent.quote_id,
      currentQuoteId: booking.quote?.id ?? null,
      blockTime: result.blockTime,
      lockExpiresAt: Date.parse(intent.expires_at) / 1000,
      graceSeconds: LATE_GRACE_SECONDS,
    })
    let review = settlement.kind === 'review' ? settlement.reason : null

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
      // A concurrent verify of the same signature won the unique index. Answer from
      // the row it wrote, which may belong to a different booking (SA-12).
      if (recorded.error.code === '23505') {
        const winner = await db.from('payments').select('request_id').eq('tx_signature', signature).maybeSingle()
        if (winner.error) throw new Error(winner.error.message)
        if (winner.data && duplicateOutcome(winner.data.request_id, intent.request_id) === 'mismatch') {
          return fail('That transaction has already been used to settle a different booking.', 409, {
            outcome: 'mismatch' satisfies VerifyOutcome,
          })
        }
        return ok({
          outcome: 'already_paid' satisfies VerifyOutcome,
          message: 'This payment was already confirmed.',
        })
      }
      throw new Error(recorded.error.message)
    }

    // Each step below is conditional on the state it was decided against, so a
    // concurrent transfer or operator action turns into a review, never a silent
    // overwrite (SA-12).
    const consumed = await db
      .from('payment_intents')
      .update({ status: 'consumed' })
      .eq('id', intent.id)
      .eq('status', 'open')
      .select('id')
    if (consumed.error) throw new Error(consumed.error.message)
    if (!review && consumed.data.length === 0) {
      review = 'Its rate lock had already been settled by another transfer.'
    }

    if (!review) {
      const moved = await db
        .from('booking_requests')
        .update({ status: 'paid' })
        .eq('id', intent.request_id)
        .eq('user_id', viewer.id)
        .eq('status', 'quoted')
        .select('id')
      if (moved.error) throw new Error(moved.error.message)
      if (moved.data.length === 0) review = 'The booking changed state while the transfer was being verified.'
    }

    after(() =>
      notifyPayment({
        requestId: intent.request_id,
        token: intent.token,
        amount: result.observedAmount,
        amountUsd: intent.amount_usd,
        signature,
        review,
      }),
    )

    if (!review && booking.category === 'jets') {
      after(() =>
        notifyMemberPassengersNeeded(intent.request_id).catch((cause) =>
          console.error('[solcierge] member alert failed:', cause),
        ),
      )
    }

    if (review) {
      console.warn('[solcierge] payment needs review', { intent: intent.id, signature, review })
      return ok({
        outcome: 'needs_review' satisfies VerifyOutcome,
        payment: recorded.data,
        message: NEEDS_REVIEW_MESSAGE,
      })
    }

    return ok({
      outcome: 'paid' satisfies VerifyOutcome,
      payment: recorded.data,
      message: 'Payment confirmed on chain.',
    })
  } catch (error) {
    return handleError(error)
  }
}

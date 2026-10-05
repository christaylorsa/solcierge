import { z } from 'zod'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { requireViewer } from '@/lib/auth'
import { getRequest } from '@/lib/data'
import { serverEnv } from '@/lib/env'
import { getSolPrice } from '@/lib/price'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createLimiter } from '@/lib/ratelimit'
import { TERMS_VERSION } from '@/lib/terms'

export const dynamic = 'force-dynamic'

// Per instance (SA-17). Each lock can cost two price-feed calls.
const perMember = createLimiter({ limit: 20, windowMs: 60_000 })

const WALLET_REQUIRED = 'Connect and sign in with the wallet you will pay from.'

const schema = z.object({
  request_id: z.string().uuid(),
  token: z.enum(['SOL', 'USDC']),
  accept_terms: z.literal(true),
  terms_version: z.string(),
})

/**
 * Takes the rate lock.
 *
 * The USD quote is converted to SOL against a live feed here, once, and the result
 * is written down. From this point the amount is the server's number: the pay panel
 * displays it, the wallet sends it, and the verifier checks against it. Nothing the
 * browser reports can change what we will accept.
 */
export async function POST(request: Request) {
  try {
    const viewer = await requireViewer()
    // Paying needs a signed-in wallet: verification binds the transfer to it (SA-03).
    if (!viewer.wallet_address) return fail(WALLET_REQUIRED, 403)
    if (!perMember.take(viewer.id)) return fail('Too many rate locks in a minute. Wait a moment and try again.', 429)
    const env = serverEnv()

    const parsed = schema.safeParse(await readJson<unknown>(request))
    if (!parsed.success) {
      const missingTerms = parsed.error.issues.some((issue) => issue.path[0] === 'accept_terms')
      return fail(missingTerms ? 'Accept the terms to continue.' : 'Pick SOL or USDC to continue.', 422)
    }
    const { request_id, token, terms_version } = parsed.data
    if (terms_version !== TERMS_VERSION) {
      return fail('Our terms have been updated since this page loaded. Refresh to read and accept the current version.', 409)
    }

    // Scoped by owner: a member can only lock a rate against their own request.
    const booking = await getRequest(request_id, viewer.id)
    if (!booking) return fail('We cannot find that request on your account.', 404)

    if (booking.status === 'paid' || booking.status === 'fulfilled') {
      return fail('That booking is already settled.', 409)
    }
    if (booking.status === 'cancelled') {
      return fail('That request was cancelled. Start a new one and we will re-quote.', 409)
    }
    if (!booking.quote) {
      return fail('There is no quote on that request yet. The desk is still sourcing.', 409)
    }
    // A pending request with an old quote attached is one the desk took back to
    // sourcing. Only a live quote can be paid (SA-05).
    if (booking.status !== 'quoted') {
      return fail('The desk is reworking this quote. It will reappear here when it is ready.', 409)
    }
    if (Date.parse(booking.quote.expires_at) < Date.now()) {
      return fail('That quote has expired. Ask the desk to refresh it, prices move.', 409)
    }

    const amountUsd = Number(booking.quote.amount_usd)
    let amount: number
    let solPrice: number | null = null

    if (token === 'SOL') {
      try {
        const price = await getSolPrice()
        solPrice = price.usd
        amount = Number((amountUsd / price.usd).toFixed(9))
      } catch {
        return fail(
          'We could not get a reliable SOL rate just now. Pay in USDC, or try again in a moment.',
          503,
        )
      }
    } else {
      amount = Number(amountUsd.toFixed(6))
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return fail('That quote does not convert to a payable amount. The desk has been notified.', 500)
    }

    const db = supabaseAdmin()

    // One live lock per request. Opening the panel again supersedes the last one.
    await db
      .from('payment_intents')
      .update({ status: 'expired' })
      .eq('request_id', request_id)
      .eq('status', 'open')

    const expiresAt = new Date(Date.now() + env.rateLockSeconds * 1000).toISOString()

    const inserted = await db
      .from('payment_intents')
      .insert({
        request_id,
        quote_id: booking.quote.id,
        token,
        amount,
        amount_usd: amountUsd,
        sol_price_usd: solPrice,
        recipient: env.treasuryWallet,
        mint: token === 'USDC' ? env.usdcMint : null,
        status: 'open',
        expires_at: expiresAt,
        terms_version: TERMS_VERSION,
        terms_accepted_at: new Date().toISOString(),
      })
      .select('id, token, amount, amount_usd, sol_price_usd, recipient, mint, status, expires_at, created_at')
      .single()

    if (inserted.error) {
      // A concurrent lock on the same request won the one-open-intent index (SA-12).
      if (inserted.error.code === '23505') {
        return fail('Another rate lock is being taken for this booking. Try again in a moment.', 409)
      }
      throw new Error(inserted.error.message)
    }

    return ok({ intent: inserted.data, lockSeconds: env.rateLockSeconds }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}

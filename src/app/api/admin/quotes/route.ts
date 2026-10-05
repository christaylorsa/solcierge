import { z } from 'zod'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'
import { getSolPrice } from '@/lib/price'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const schema = z.object({
  request_id: z.string().uuid(),
  amount_usd: z.coerce.number().positive().max(100_000_000),
  /** Hours from now. The operator picks from a small set in the UI. */
  valid_for_hours: z.coerce.number().int().min(1).max(24 * 30).default(72),
  notes: z.string().trim().max(4000).optional(),
})

/**
 * Operator sets a quote. amount_usd is the binding figure; the SOL and USDC columns
 * are recorded as indicative at quote time. The amount a member actually sends is
 * re-derived from a live rate when they open the pay panel.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin()

    const parsed = schema.safeParse(await readJson<unknown>(request))
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'That quote could not be read.', 422)
    }
    const { request_id, amount_usd, valid_for_hours, notes } = parsed.data

    const db = supabaseAdmin()
    const target = await db
      .from('booking_requests')
      .select('id, status')
      .eq('id', request_id)
      .maybeSingle()

    if (target.error) throw new Error(target.error.message)
    if (!target.data) return fail('That request no longer exists.', 404)
    if (target.data.status === 'paid' || target.data.status === 'fulfilled') {
      return fail('That request is already settled. Re-quoting it would be misleading.', 409)
    }

    // An unreachable price feed must not block quoting: USD is what binds.
    let amountSol: number | null = null
    try {
      const price = await getSolPrice()
      amountSol = Number((amount_usd / price.usd).toFixed(9))
    } catch {
      amountSol = null
    }

    const expiresAt = new Date(Date.now() + valid_for_hours * 3600_000).toISOString()

    const inserted = await db
      .from('quotes')
      .insert({
        request_id,
        amount_usd,
        amount_sol: amountSol,
        amount_usdc: Number(amount_usd.toFixed(6)),
        expires_at: expiresAt,
        notes: notes ?? null,
      })
      .select('id, request_id, amount_usd, amount_sol, amount_usdc, expires_at, notes, created_at')
      .single()

    if (inserted.error) throw new Error(inserted.error.message)

    if (target.data.status !== 'quoted') {
      const moved = await db.from('booking_requests').update({ status: 'quoted' }).eq('id', request_id)
      if (moved.error) throw new Error(moved.error.message)
    }

    // A new quote supersedes any rate lock taken against the old one.
    await db
      .from('payment_intents')
      .update({ status: 'expired' })
      .eq('request_id', request_id)
      .eq('status', 'open')

    return ok({ quote: inserted.data }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}

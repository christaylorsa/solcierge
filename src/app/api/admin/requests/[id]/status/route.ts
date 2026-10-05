import { after } from 'next/server'
import { z } from 'zod'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'
import { deleteManifest } from '@/lib/manifests'
import { notifyMemberConfirmed } from '@/lib/notify'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { REQUEST_STATUSES, type RequestStatus } from '@/lib/types'
import { isUuid } from '@/lib/validate'

export const dynamic = 'force-dynamic'

const schema = z.object({ status: z.enum(REQUEST_STATUSES) })

/**
 * Transitions an operator may make by hand. `paid` is deliberately absent: only a
 * verified on-chain transfer can set it, in /api/payments/verify.
 */
const ALLOWED: Record<RequestStatus, RequestStatus[]> = {
  pending: ['quoted', 'cancelled'],
  quoted: ['pending', 'cancelled'],
  paid: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: ['pending'],
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await context.params
    if (!isUuid(id)) return fail('That request no longer exists.', 404)

    const parsed = schema.safeParse(await readJson<unknown>(request))
    if (!parsed.success) return fail('That is not a status we recognise.', 422)
    const next = parsed.data.status

    const db = supabaseAdmin()
    const current = await db.from('booking_requests').select('id, status').eq('id', id).maybeSingle()
    if (current.error) throw new Error(current.error.message)
    if (!current.data) return fail('That request no longer exists.', 404)

    const from = current.data.status as RequestStatus
    if (from === next) return ok({ status: next })

    if (!ALLOWED[from].includes(next)) {
      const reason =
        next === 'paid'
          ? 'Paid is set by on-chain verification, never by hand.'
          : `A ${from} request cannot move straight to ${next}.`
      return fail(reason, 409)
    }

    const updated = await db
      .from('booking_requests')
      .update({ status: next })
      .eq('id', id)
      .select('id, status, updated_at')
      .single()

    if (updated.error) throw new Error(updated.error.message)

    if (next === 'fulfilled') {
      // The member hears the booking is confirmed and where the paperwork is.
      after(() => notifyMemberConfirmed(id).catch((cause) => console.error('[solcierge] member alert failed:', cause)))
    }

    if (next === 'cancelled') {
      // Nothing to send to an operator any more, so passport details go now.
      await deleteManifest(id)
      await db.from('payment_intents').update({ status: 'expired' }).eq('request_id', id).eq('status', 'open')
    }

    return ok({ request: updated.data })
  } catch (error) {
    return handleError(error)
  }
}

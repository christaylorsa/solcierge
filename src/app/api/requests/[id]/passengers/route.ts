import { after } from 'next/server'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { requireViewer } from '@/lib/auth'
import { getRequest } from '@/lib/data'
import { getManifest, saveManifest } from '@/lib/manifests'
import { notifyPassengersReceived } from '@/lib/notify'
import { checkPassengers, lastTravelDate } from '@/lib/passengers'
import { createLimiter } from '@/lib/ratelimit'
import { isUuid } from '@/lib/validate'

export const dynamic = 'force-dynamic'

// Per instance (SA-17).
const perMember = createLimiter({ limit: 20, windowMs: 10 * 60_000 })

/**
 * The member submits or edits the passengers on a paid flight. Editable only while
 * the booking is paid: once the desk confirms it with the operator, it locks.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireViewer()
    if (!perMember.take(viewer.id)) return fail('Too many saves in a few minutes. Wait a moment and try again.', 429)

    const { id } = await context.params
    if (!isUuid(id)) return fail('That booking no longer exists.', 404)
    const booking = await getRequest(id, viewer.id)
    if (!booking) return fail('That booking no longer exists.', 404)
    if (booking.category !== 'jets') return fail('Passenger details are only needed for flights.', 409)
    if (booking.status !== 'paid') {
      return fail(
        booking.status === 'fulfilled'
          ? 'This booking is confirmed, so the passenger list is locked. Contact the desk to change it.'
          : 'Passenger details open once the booking is paid.',
        409,
      )
    }

    const body = await readJson<{ passengers?: unknown }>(request)
    const travelDate = lastTravelDate(booking.details ?? {})
    const checked = checkPassengers(body?.passengers, { today: new Date().toISOString().slice(0, 10), travelDate })
    if (!checked.ok) return fail(checked.error.message, 422, { index: checked.error.index, field: checked.error.field })

    const existed = (await getManifest(id)) !== null
    await saveManifest(id, checked.passengers, travelDate)

    after(() =>
      notifyPassengersReceived({ requestId: id, count: checked.passengers.length, updated: existed }).catch((cause) =>
        console.error('[solcierge] alert failed:', cause),
      ),
    )

    return ok({ saved: checked.passengers.length })
  } catch (error) {
    return handleError(error)
  }
}

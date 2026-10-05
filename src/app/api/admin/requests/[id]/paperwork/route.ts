import { z } from 'zod'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/validate'

export const dynamic = 'force-dynamic'

const schema = z.object({
  confirmation_ref: z.string().trim().max(120),
  itinerary: z.string().trim().max(8000),
})

/** The desk writes the booking reference and the itinerary the member reads. Empty clears. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await context.params
    if (!isUuid(id)) return fail('That request no longer exists.', 404)

    const parsed = schema.safeParse(await readJson<unknown>(request))
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'That could not be read.', 422)

    const updated = await supabaseAdmin()
      .from('booking_requests')
      .update({
        confirmation_ref: parsed.data.confirmation_ref || null,
        itinerary: parsed.data.itinerary || null,
      })
      .eq('id', id)
      .select('id, confirmation_ref, itinerary')
      .maybeSingle()

    if (updated.error) throw new Error(updated.error.message)
    if (!updated.data) return fail('That request no longer exists.', 404)
    return ok({ paperwork: updated.data })
  } catch (error) {
    return handleError(error)
  }
}

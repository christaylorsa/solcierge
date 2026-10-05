import { fail, handleError, ok } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'
import { notifyMemberPaperwork } from '@/lib/notify'
import { isUuid } from '@/lib/validate'

export const dynamic = 'force-dynamic'

/**
 * The desk tells a member their paperwork changed. Sent on demand rather than per
 * upload, so three files make one message. Answers with the channels it reached.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await context.params
    if (!isUuid(id)) return fail('That request no longer exists.', 404)

    return ok({ delivered: await notifyMemberPaperwork(id) })
  } catch (error) {
    return handleError(error)
  }
}

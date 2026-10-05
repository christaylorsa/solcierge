import { handleError, ok } from '@/lib/api'
import { getViewer } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** Who the server thinks you are. The header uses this to reconcile with the wallet adapter. */
export async function GET() {
  try {
    const viewer = await getViewer()
    return ok({ viewer })
  } catch (error) {
    return handleError(error)
  }
}

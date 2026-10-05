import { fail, handleError, ok } from '@/lib/api'
import { getSolPrice } from '@/lib/price'

export const dynamic = 'force-dynamic'

/** Live SOL/USD. Used by the admin quote editor to show an indicative conversion. */
export async function GET() {
  try {
    return ok(await getSolPrice())
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No SOL price')) {
      return fail('Both price feeds are unreachable right now. Try again shortly.', 503)
    }
    return handleError(error)
  }
}

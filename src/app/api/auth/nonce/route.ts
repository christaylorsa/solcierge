import { handleError, ok } from '@/lib/api'
import { issueNonce, signInMessage } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Step one of wallet sign-in. Returns a challenge nonce, held in a signed httpOnly
 * cookie bound to this wallet for five minutes, plus the exact message to sign so
 * the client never composes it itself. See issueNonce() for what the cookie
 * guarantees.
 */
export async function GET(request: Request) {
  try {
    const wallet = new URL(request.url).searchParams.get('wallet')
    if (!wallet) return ok({ error: 'A wallet address is required.' }, { status: 400 })

    const nonce = await issueNonce(wallet)
    return ok({ nonce, message: signInMessage(wallet, nonce) })
  } catch (error) {
    return handleError(error)
  }
}

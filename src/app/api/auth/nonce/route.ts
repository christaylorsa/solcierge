import { handleError, ok } from '@/lib/api'
import { publicEnv } from '@/lib/env'
import { issueNonce } from '@/lib/session'
import { signInMessage, siwsChainId } from '@/lib/siws'

export const dynamic = 'force-dynamic'

/**
 * Step one of wallet sign-in. Returns a challenge nonce, held in a signed httpOnly
 * cookie bound to this wallet for five minutes, plus the exact message to sign so
 * the client never composes it itself. See issueNonce() for what the cookie
 * guarantees.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const wallet = url.searchParams.get('wallet')
    if (!wallet) return ok({ error: 'A wallet address is required.' }, { status: 400 })

    // Bound to the host that served this request: any host that routes here is ours,
    // and the wallet compares it with the page the member is actually on.
    const fields = await issueNonce(wallet, {
      domain: url.host,
      uri: url.origin,
      chainId: siwsChainId(publicEnv.cluster),
    })
    return ok({ nonce: fields.nonce, message: signInMessage(fields) })
  } catch (error) {
    return handleError(error)
  }
}

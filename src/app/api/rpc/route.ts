import { fail, handleError } from '@/lib/api'
import { serverEnv } from '@/lib/env'
import { clientIp, createLimiter } from '@/lib/ratelimit'
import { checkRpcBody } from '@/lib/rpc-policy'
import { readWalletSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Same-origin JSON-RPC pass-through for the browser's Solana connection.
 *
 * Mainnet's public endpoint refuses most browser traffic, and pointing the browser
 * at a paid provider would publish its API key. Instead the browser talks to this
 * route and the request is forwarded to SOLANA_RPC_URL, which never leaves the
 * server. Only the methods the pay flow and wallet adapter need are forwarded, and
 * only for a signed-in wallet within a rate limit, so this cannot be used as a
 * general-purpose relay onto the provider's quota (SA-08). The pay panel is the only
 * caller, and it always has a wallet session.
 */

// A payment is roughly 30 calls (blockhash, account reads, send, status polling).
const perWallet = createLimiter({ limit: 120, windowMs: 60_000 })
const perIp = createLimiter({ limit: 240, windowMs: 60_000 })

export async function POST(request: Request) {
  try {
    const session = await readWalletSession()
    if (!session) return fail('Sign in with your wallet to continue.', 401)
    if (!perIp.take(clientIp(request)) || !perWallet.take(session.wallet)) {
      return fail('Too many network requests. Wait a moment and try again.', 429)
    }

    const checked = checkRpcBody(await request.text())
    if ('error' in checked) return fail(checked.error, checked.status)

    try {
      const upstream = await fetch(serverEnv().rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: checked.raw,
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      })
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      })
    } catch (error) {
      console.error('[solcierge] rpc proxy error:', error)
      return fail('The Solana network could not be reached. Try again in a moment.', 502)
    }
  } catch (error) {
    return handleError(error)
  }
}

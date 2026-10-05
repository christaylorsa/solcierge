import { fail } from '@/lib/api'
import { serverEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

/**
 * Same-origin JSON-RPC pass-through for the browser's Solana connection.
 *
 * Mainnet's public endpoint refuses most browser traffic, and pointing the browser
 * at a paid provider would publish its API key. Instead the browser talks to this
 * route and the request is forwarded to SOLANA_RPC_URL, which never leaves the
 * server. Only the methods the pay flow and wallet adapter need are forwarded, so
 * this cannot be used as a general-purpose proxy onto the provider's quota.
 */
const ALLOWED_METHODS = new Set([
  'getLatestBlockhash',
  'isBlockhashValid',
  'getBlockHeight',
  'getSlot',
  'getEpochInfo',
  'getGenesisHash',
  'getBalance',
  'getAccountInfo',
  'getMultipleAccounts',
  'getTokenAccountBalance',
  'getMinimumBalanceForRentExemption',
  'getFeeForMessage',
  'getRecentPrioritizationFees',
  'getSignatureStatuses',
  'simulateTransaction',
  'sendTransaction',
])

const MAX_BODY_BYTES = 64 * 1024
const MAX_BATCH = 10

type RpcCall = { method?: unknown }

export async function POST(request: Request) {
  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return fail('Request too large.', 413)

  let parsed: RpcCall | RpcCall[]
  try {
    parsed = JSON.parse(raw)
  } catch {
    return fail('Invalid JSON-RPC body.')
  }

  const calls = Array.isArray(parsed) ? parsed : [parsed]
  if (calls.length === 0 || calls.length > MAX_BATCH) return fail('Invalid batch size.')
  const blocked = calls.find((call) => typeof call?.method !== 'string' || !ALLOWED_METHODS.has(call.method))
  if (blocked) return fail(`RPC method not allowed: ${String(blocked?.method)}`, 403)

  try {
    const upstream = await fetch(serverEnv().rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: raw,
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
}

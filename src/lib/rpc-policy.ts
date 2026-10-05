/**
 * What the /api/rpc proxy will forward. Import-free so the allowlist is unit-tested.
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

export function checkRpcBody(raw: string): { raw: string } | { error: string; status: number } {
  if (raw.length > MAX_BODY_BYTES) return { error: 'Request too large.', status: 413 }

  let parsed: RpcCall | RpcCall[]
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { error: 'Invalid JSON-RPC body.', status: 400 }
  }

  const calls = Array.isArray(parsed) ? parsed : [parsed]
  if (calls.length === 0 || calls.length > MAX_BATCH) return { error: 'Invalid batch size.', status: 400 }
  const blocked = calls.find((call) => typeof call?.method !== 'string' || !ALLOWED_METHODS.has(call.method))
  if (blocked) return { error: `RPC method not allowed: ${String(blocked?.method)}`, status: 403 }

  return { raw }
}

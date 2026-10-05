import { serverEnv } from '@/lib/env'
import { reconcilePrices } from '@/lib/price-check'

export const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112'

export type SolPrice = {
  usd: number
  source: 'jupiter' | 'coingecko'
  fetchedAt: string
}

type CacheEntry = { price: SolPrice; expiresAt: number }

// A 30s in-process cache. Enough to stop a burst of pay-panel opens from
// hammering the feed, short enough that a locked rate is always near-live.
let cache: CacheEntry | null = null
const CACHE_MS = 30_000

async function fromJupiter(): Promise<SolPrice> {
  const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${WRAPPED_SOL_MINT}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error(`Jupiter responded ${res.status}`)

  const body = (await res.json()) as Record<string, unknown>
  const entry = body?.[WRAPPED_SOL_MINT] as Record<string, unknown> | undefined
  // v3 returns usdPrice; v2 returned a stringified `price`. Accept both.
  const raw = entry?.usdPrice ?? entry?.price
  const usd = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN
  if (!Number.isFinite(usd) || usd <= 0) throw new Error('Jupiter returned no usable price')

  return { usd, source: 'jupiter', fetchedAt: new Date().toISOString() }
}

async function fromCoinGecko(): Promise<SolPrice> {
  const env = serverEnv()
  const base = env.coingeckoKey
    ? 'https://pro-api.coingecko.com/api/v3/simple/price'
    : 'https://api.coingecko.com/api/v3/simple/price'

  const res = await fetch(`${base}?ids=solana&vs_currencies=usd`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
    headers: env.coingeckoKey ? { 'x-cg-pro-api-key': env.coingeckoKey } : undefined,
  })
  if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`)

  const body = (await res.json()) as { solana?: { usd?: number } }
  const usd = body?.solana?.usd
  if (!Number.isFinite(usd) || !usd || usd <= 0) throw new Error('CoinGecko returned no usable price')

  return { usd, source: 'coingecko', fetchedAt: new Date().toISOString() }
}

/**
 * Live SOL/USD. Asks both sources at once and cross-checks them (SA-09): the
 * configured source wins when they agree, either one is used alone when the other
 * is down, and a disagreement beyond MAX_DIVERGENCE refuses rather than guesses.
 * Throws with a "No SOL price" message in those cases, which the pay panel surfaces
 * as a retryable error rather than a broken page.
 */
export async function getSolPrice(): Promise<SolPrice> {
  if (cache && cache.expiresAt > Date.now()) return cache.price

  const env = serverEnv()
  const order = env.priceSource === 'coingecko' ? [fromCoinGecko, fromJupiter] : [fromJupiter, fromCoinGecko]
  const [primary, secondary] = await Promise.allSettled(order.map((attempt) => attempt()))

  const value = (result: PromiseSettledResult<SolPrice>) => (result.status === 'fulfilled' ? result.value : null)
  const reconciled = reconcilePrices(value(primary)?.usd ?? null, value(secondary)?.usd ?? null)

  if ('error' in reconciled) {
    const failures = [primary, secondary]
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)))
    console.warn('[solcierge] SOL price refused:', reconciled.error, failures)
    throw new Error(`No SOL price available (${[reconciled.error, ...failures].join('; ')})`)
  }

  const price = value(reconciled.from === 'primary' ? primary : secondary) as SolPrice
  cache = { price, expiresAt: Date.now() + CACHE_MS }
  return price
}

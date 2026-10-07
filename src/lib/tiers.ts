/**
 * Membership tiers, earned on lifetime spend.
 *
 * Spend is the USD value of every booking that has actually settled (paid, or
 * confirmed after payment). Cancelled bookings drop out, because they are
 * refunded. Thresholds live here and nowhere else: change a number and the
 * profile, the desk and the copy all follow. Import-free so it is unit-tested
 * directly.
 */

export type TierKey = 'member' | 'reserve' | 'black'

export type Tier = {
  key: TierKey
  name: string
  /** Roman numeral shown on the tier card. */
  numeral: string
  /** Lifetime settled spend, in USD, at which the tier opens. */
  from: number
  /** One line under the tier name. Says what the tier is, never what it gets. */
  line: string
}

export const TIERS: readonly Tier[] = [
  { key: 'member', name: 'Member', numeral: 'I', from: 0, line: 'From your first request.' },
  { key: 'reserve', name: 'Reserve', numeral: 'II', from: 25_000, line: 'For members who book with us often.' },
  { key: 'black', name: 'Black', numeral: 'III', from: 100_000, line: 'Our most valued members.' },
]

export function tierFor(spend: number): Tier {
  const safe = Number.isFinite(spend) && spend > 0 ? spend : 0
  let current = TIERS[0]
  for (const tier of TIERS) if (safe >= tier.from) current = tier
  return current
}

export type Standing = {
  spend: number
  tier: Tier
  /** The tier above, or null at the top. */
  next: Tier | null
  /** USD still to settle before `next` opens. Null at the top. */
  toNext: number | null
}

export function standing(spend: number): Standing {
  const safe = Number.isFinite(spend) && spend > 0 ? spend : 0
  const tier = tierFor(safe)
  const next = TIERS[TIERS.indexOf(tier) + 1] ?? null
  return { spend: safe, tier, next, toNext: next ? Math.max(0, next.from - safe) : null }
}

/** Statuses whose quote counts as money spent. */
const SETTLED = new Set(['paid', 'fulfilled'])

/**
 * Lifetime settled spend from a member's bookings. Takes the newest quote's USD
 * figure, which is what the member paid against: the verifier only settles a
 * booking whose transfer matches the live quote.
 */
export function lifetimeSpend(
  requests: { status: string; quote: { amount_usd: number | string } | null }[],
): number {
  let total = 0
  for (const request of requests) {
    if (!SETTLED.has(request.status) || !request.quote) continue
    const amount = Number(request.quote.amount_usd)
    if (Number.isFinite(amount) && amount > 0) total += amount
  }
  return Math.round(total * 100) / 100
}

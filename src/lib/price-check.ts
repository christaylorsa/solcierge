/**
 * Cross-checks the two SOL/USD feeds before a price may set what a member owes.
 *
 * The locked SOL amount is the USD quote divided by this number, so a bad print
 * (an outage artefact, a broken pool) would under- or over-charge a whole booking
 * for the length of the lock. When both feeds answer they must agree within
 * MAX_DIVERGENCE; when only one answers it is used alone, which keeps SOL payable
 * through a single-feed outage (whether to refuse instead is an open decision, see
 * SA-09 in SECURITY-AUDIT.md). Import-free so it is unit-tested.
 */
export const MAX_DIVERGENCE = 0.02

export type Reconciled = { usd: number; from: 'primary' | 'secondary' } | { error: string }

export function reconcilePrices(
  primary: number | null,
  secondary: number | null,
  maxDivergence = MAX_DIVERGENCE,
): Reconciled {
  const usable = (value: number | null): value is number => value !== null && Number.isFinite(value) && value > 0
  const a = usable(primary) ? primary : null
  const b = usable(secondary) ? secondary : null

  if (a !== null && b !== null) {
    const divergence = Math.abs(a - b) / Math.min(a, b)
    if (divergence > maxDivergence) {
      return { error: `price feeds disagree by ${(divergence * 100).toFixed(1)}% (${a} vs ${b})` }
    }
    return { usd: a, from: 'primary' }
  }
  if (a !== null) return { usd: a, from: 'primary' }
  if (b !== null) return { usd: b, from: 'secondary' }
  return { error: 'no feed returned a usable price' }
}

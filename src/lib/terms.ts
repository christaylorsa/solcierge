/**
 * The version of the legal pages a member accepts at the pay step. Recorded on
 * every payment intent alongside the acceptance time, so there is evidence of
 * which terms formed the contract. Bump it whenever any /legal page changes:
 * the intent route refuses acceptances of an older version, which forces a
 * reload onto the current text.
 */
export const TERMS_VERSION = '2026-10-05'

export const TERMS_LINKS = [
  { href: '/legal/concierge-terms', label: 'Concierge terms' },
  { href: '/legal/crypto-risk', label: 'Crypto volatility notice' },
  { href: '/legal/refunds', label: 'Cancellation and refunds policy' },
] as const

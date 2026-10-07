/**
 * Referral codes, the parts that need no network or database.
 *
 * A member shares solcierge.xyz/r/<code>. The middleware drops the code into a
 * cookie, and when that visitor's account is first created the code is turned into
 * a referred_by link. Codes are stored lowercase and shown uppercase, and are
 * matched case-insensitively. Import-free (no node: modules either) because the
 * middleware runs on the edge.
 */

export const REFERRAL_COOKIE = 'solcierge_ref'
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export const CODE_MIN = 3
export const CODE_MAX = 20

/** Loose shape check for the /r/<code> path, before any normalising. */
export const CODE_IN_PATH = /^\/r\/([A-Za-z0-9-]{3,20})\/?$/

const CODE_SHAPE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/**
 * Codes that could pass for us or for staff. A member who wants "desk" or
 * "solcierge" as their code would be borrowing the house's voice.
 */
const RESERVED = new Set([
  'admin',
  'administrator',
  'concierge',
  'desk',
  'help',
  'official',
  'owner',
  'root',
  'security',
  'solcierge',
  'staff',
  'support',
  'team',
  'verify',
])

export function normaliseCode(input: string): string {
  return input.trim().replace(/^@/, '').toLowerCase()
}

export type CodeCheck = { ok: true; code: string } | { ok: false; message: string }

/** Validates a code a member typed. Returns the stored (lowercase) form. */
export function checkCode(input: unknown): CodeCheck {
  if (typeof input !== 'string') return { ok: false, message: 'Type a code.' }
  const code = normaliseCode(input)
  if (code.length < CODE_MIN || code.length > CODE_MAX) {
    return { ok: false, message: `Use ${CODE_MIN} to ${CODE_MAX} characters.` }
  }
  if (!CODE_SHAPE.test(code)) {
    return { ok: false, message: 'Letters, numbers and hyphens only, starting and ending with a letter or number.' }
  }
  if (code.includes('--')) return { ok: false, message: 'One hyphen at a time.' }
  if (RESERVED.has(code) || [...RESERVED].some((word) => code.startsWith(`${word}-`))) {
    return { ok: false, message: 'That code is reserved. Try another.' }
  }
  return { ok: true, code }
}

/** No 0/o, 1/l/i: a code read aloud or off a card should not be ambiguous. */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

/** A fresh random code, used until the member picks their own. */
export function generateCode(length = 6): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('')
}

export function displayCode(code: string): string {
  return code.toUpperCase()
}

export function referralUrl(siteUrl: string, code: string): string {
  return `${siteUrl.replace(/\/$/, '')}/r/${displayCode(code)}`
}

/** The X compose link for sharing a referral. The card unfurls from the URL. */
export function shareOnXUrl(siteUrl: string, code: string): string {
  const text = 'Jets, yachts, villas and tables, quoted in USD and settled in SOL or USDC. My introduction to Solcierge:'
  const params = new URLSearchParams({ text, url: referralUrl(siteUrl, code) })
  return `https://x.com/intent/post?${params.toString()}`
}

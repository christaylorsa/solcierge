import { PublicKey } from '@solana/web3.js'

/**
 * Shape checks for identifiers that arrive in URLs and bodies (SA-16), so junk is
 * refused with a 400 or 404 instead of reaching Postgres or a signed cookie.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

/** A canonical base58 Solana address: parses to 32 bytes and round-trips unchanged. */
export function isSolanaAddress(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 32 || value.length > 44) return false
  try {
    return new PublicKey(value).toBase58() === value
  } catch {
    return false
  }
}

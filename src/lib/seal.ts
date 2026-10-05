/**
 * Application-level encryption for the most sensitive data we hold (passenger
 * passport details). AES-256-GCM with a key derived from SESSION_SECRET, so the
 * database, its backups and the Supabase dashboard only ever see ciphertext.
 *
 * Rotating SESSION_SECRET makes existing sealed values unreadable. That is an
 * accepted trade: manifests are short-lived, and the member can re-enter them.
 * Import-free so it is unit-tested directly.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

const VERSION = 'v1'

function key(secret: string): Buffer {
  return Buffer.from(hkdfSync('sha256', secret, 'solcierge', 'passenger-data-v1', 32))
}

export function seal(value: unknown, secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.')
}

/** The sealed value, or null when it was sealed under another secret or tampered with. */
export function unseal<T>(sealed: string, secret: string): T | null {
  const [version, iv, tag, body] = sealed.split('.')
  if (version !== VERSION || !iv || !tag || !body) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(secret), Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    const plain = Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()])
    return JSON.parse(plain.toString('utf8')) as T
  } catch {
    return null
  }
}

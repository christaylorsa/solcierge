import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { serverEnv } from '@/lib/env'
import type { SignInFields } from '@/lib/siws'

export const SESSION_COOKIE = 'solcierge_session'
export const NONCE_COOKIE = 'solcierge_nonce'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
const NONCE_TTL_SECONDS = 300

export type WalletSession = {
  wallet: string
  userId: string
}

function key(): Uint8Array {
  return new TextEncoder().encode(serverEnv().sessionSecret)
}

export async function issueWalletSession(session: WalletSession): Promise<void> {
  const token = await new SignJWT({ wallet: session.wallet, userId: session.userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key())

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function readWalletSession(): Promise<WalletSession | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key())
    if (typeof payload.wallet !== 'string' || typeof payload.userId !== 'string') return null
    return { wallet: payload.wallet, userId: payload.userId }
  } catch {
    // Expired or tampered. Treat as signed out rather than erroring the page.
    return null
  }
}

export async function clearWalletSession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

// --- sign-in challenge -----------------------------------------------------
// The nonce lives in a signed, httpOnly, five-minute cookie rather than a table,
// so sign-in needs no server state and works across serverless instances.
//
// What that does and does not buy, stated plainly:
//   - it proves the challenge came from us and has not expired
//   - it is bound to one wallet, so a captured challenge cannot be used to
//     authenticate a different address
//   - it carries the domain it was issued on, and the signed text (SIWS format,
//     see lib/siws.ts) is rebuilt from it, so wallets can warn when a different
//     site presents our challenge
//   - the cookie is deleted on use, but deletion happens in the client. A caller
//     that keeps presenting the same cookie can retry inside the five-minute
//     window, which requires already holding a valid signature for that wallet.
//     Over TLS that is not a meaningful attack, and it grants nothing the holder
//     of that signature did not already have.
// If truly server-tracked single use is ever needed, add a used_nonces table with
// a TTL and check it here.

export async function issueNonce(
  wallet: string,
  site: { domain: string; uri: string; chainId: string },
): Promise<SignInFields> {
  const issued = new Date()
  const fields: SignInFields = {
    ...site,
    address: wallet,
    nonce: crypto.randomUUID().replace(/-/g, ''),
    issuedAt: issued.toISOString(),
    expirationTime: new Date(issued.getTime() + NONCE_TTL_SECONDS * 1000).toISOString(),
  }

  const token = await new SignJWT({ ...fields })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${NONCE_TTL_SECONDS}s`)
    .sign(key())

  const store = await cookies()
  store.set(NONCE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: NONCE_TTL_SECONDS,
  })
  return fields
}

/**
 * Verifies the challenge came from us, has not expired, and was issued for this
 * exact wallet, and returns the fields it was issued with so the caller rebuilds
 * the signed text from server-held values. Clears the cookie either way, so a
 * failure does not leave a live challenge behind.
 */
export async function consumeNonce(candidate: string, wallet: string): Promise<SignInFields | null> {
  const store = await cookies()
  const token = store.get(NONCE_COOKIE)?.value
  if (!token) return null
  store.delete(NONCE_COOKIE)
  try {
    const { payload } = await jwtVerify(token, key())
    if (payload.nonce !== candidate || payload.address !== wallet) return null
    const fields = ['domain', 'address', 'uri', 'chainId', 'nonce', 'issuedAt', 'expirationTime'] as const
    if (!fields.every((name) => typeof payload[name] === 'string')) return null
    return Object.fromEntries(fields.map((name) => [name, payload[name]])) as SignInFields
  } catch {
    return null
  }
}

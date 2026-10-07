import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

/**
 * The signed tokens the app issues (sessions, sign-in challenges, the X connect
 * round trip) share one
 * secret. Each carries its own audience, so neither can ever be presented as the
 * other, and verification accepts HS256 only (SA-13). Free of app imports so it is
 * unit-tested directly.
 */
export const MIN_SECRET_LENGTH = 32

const AUDIENCE = {
  session: 'solcierge:session',
  'siws-nonce': 'solcierge:siws-nonce',
  'x-oauth': 'solcierge:x-oauth',
} as const

export type TokenKind = keyof typeof AUDIENCE

function secretKey(secret: string): Uint8Array {
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`)
  }
  return new TextEncoder().encode(secret)
}

export async function signToken(
  kind: TokenKind,
  claims: Record<string, unknown>,
  ttlSeconds: number,
  secret: string,
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(AUDIENCE[kind])
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretKey(secret))
}

/** The payload, or null for anything expired, tampered, of the wrong kind or algorithm. */
export async function verifyToken(kind: TokenKind, token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), {
      algorithms: ['HS256'],
      audience: AUDIENCE[kind],
    })
    return payload
  } catch {
    return null
  }
}

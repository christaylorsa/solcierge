/**
 * Connecting an X account, the parts that need no network or database.
 *
 * OAuth 2.0 authorization code with PKCE, as a confidential client. We ask for the
 * two read scopes /2/users/me needs, read the profile once, store the public bits
 * (id, handle, display name, avatar) and revoke the token straight away. Solcierge
 * never holds a live X token, so it can never post or read on a member's behalf.
 * Import-free so it is unit-tested directly.
 */
import { createHash, randomBytes } from 'node:crypto'

export const X_AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize'
export const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token'
export const X_REVOKE_URL = 'https://api.x.com/2/oauth2/revoke'
export const X_ME_URL = 'https://api.x.com/2/users/me?user.fields=profile_image_url'
export const X_SCOPES = ['users.read', 'tweet.read'] as const

/** The OAuth round trip has this long to come back before the attempt is void. */
export const X_STATE_TTL_SECONDS = 600

export function newVerifier(): string {
  return randomBytes(48).toString('base64url')
}

export function newState(): string {
  return randomBytes(24).toString('base64url')
}

export function challengeFor(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function authorizeUrl(options: { clientId: string; redirectUri: string; state: string; verifier: string }): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    scope: X_SCOPES.join(' '),
    state: options.state,
    code_challenge: challengeFor(options.verifier),
    code_challenge_method: 'S256',
  })
  return `${X_AUTHORIZE_URL}?${params.toString()}`
}

export type XProfile = {
  id: string
  username: string
  name: string
  avatarUrl: string | null
}

const USERNAME = /^[A-Za-z0-9_]{1,15}$/
const USER_ID = /^[0-9]{1,25}$/

/**
 * The avatar is fetched again later (by the share card renderer), so only X's own
 * image host is accepted. Anything else is dropped rather than trusted.
 */
export function safeAvatarUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.hostname !== 'pbs.twimg.com') return null
  // X hands out the 48px "_normal" size. The 400px one sits at the same path.
  url.pathname = url.pathname.replace(/_normal(\.[a-z]+)$/i, '_400x400$1')
  return url.toString()
}

/** Reads the /2/users/me response. Null when it is not the shape we expect. */
export function parseMe(body: unknown): XProfile | null {
  const data = (body as { data?: Record<string, unknown> } | null)?.data
  if (!data) return null
  const { id, username, name, profile_image_url } = data
  if (typeof id !== 'string' || !USER_ID.test(id)) return null
  if (typeof username !== 'string' || !USERNAME.test(username)) return null
  const display = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, 50) : ''
  return { id, username, name: display || username, avatarUrl: safeAvatarUrl(profile_image_url) }
}

import { NextResponse } from 'next/server'
import { getViewer } from '@/lib/auth'
import { publicEnv, serverEnv } from '@/lib/env'
import { createLimiter } from '@/lib/ratelimit'
import { signToken } from '@/lib/tokens'
import { X_STATE_TTL_SECONDS, authorizeUrl, newState, newVerifier } from '@/lib/xauth'
import { X_OAUTH_COOKIE, profileRedirect } from '../shared'

export const dynamic = 'force-dynamic'

// Per instance (SA-17). Every completed round trip is a paid X API call.
const perMember = createLimiter({ limit: 10, windowMs: 10 * 60_000 })

/**
 * Sends the member to X to approve the connection. The PKCE verifier and the state
 * travel in a signed, httpOnly, ten-minute cookie bound to this member, so the
 * callback needs no server-side storage and cannot be completed for anyone else.
 */
export async function GET(request: Request) {
  const viewer = await getViewer()
  if (!viewer) return profileRedirect(request, 'signin')
  if (!perMember.take(viewer.id)) return profileRedirect(request, 'busy')

  const env = serverEnv()
  if (!env.xClientId || !env.xClientSecret) return profileRedirect(request, 'unavailable')

  const state = newState()
  const verifier = newVerifier()
  const token = await signToken('x-oauth', { state, verifier, userId: viewer.id }, X_STATE_TTL_SECONDS, env.sessionSecret)

  const response = NextResponse.redirect(
    authorizeUrl({ clientId: env.xClientId, redirectUri: `${publicEnv.siteUrl}/api/x/callback`, state, verifier }),
  )
  response.cookies.set(X_OAUTH_COOKIE, token, {
    httpOnly: true,
    // Lax, not strict: X sends the member back with a top-level GET from x.com.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/x',
    maxAge: X_STATE_TTL_SECONDS,
  })
  return response
}

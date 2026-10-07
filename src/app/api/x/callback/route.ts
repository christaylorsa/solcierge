import { cookies } from 'next/headers'
import { after } from 'next/server'
import { getViewer } from '@/lib/auth'
import { publicEnv, serverEnv } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyToken } from '@/lib/tokens'
import { X_ME_URL, X_REVOKE_URL, X_TOKEN_URL, parseMe } from '@/lib/xauth'
import { X_OAUTH_COOKIE, profileRedirect } from '../shared'

export const dynamic = 'force-dynamic'

/**
 * X sends the member back here. We check the state against the signed cookie,
 * swap the code for a token, read the public profile once, revoke the token, and
 * keep only the handle, display name and avatar.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('error')) return profileRedirect(request, 'cancelled')

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const env = serverEnv()

  const raw = (await cookies()).get(X_OAUTH_COOKIE)?.value
  const claims = raw ? await verifyToken('x-oauth', raw, env.sessionSecret) : null
  if (!code || !state || !claims || claims.state !== state || typeof claims.verifier !== 'string') {
    return profileRedirect(request, 'expired')
  }

  // The member who started the round trip must be the one finishing it.
  const viewer = await getViewer()
  if (!viewer) return profileRedirect(request, 'signin')
  if (viewer.id !== claims.userId) return profileRedirect(request, 'expired')

  const basic = Buffer.from(`${env.xClientId}:${env.xClientSecret}`).toString('base64')

  let accessToken: string
  try {
    const tokenRes = await fetch(X_TOKEN_URL, {
      method: 'POST',
      headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${publicEnv.siteUrl}/api/x/callback`,
        code_verifier: claims.verifier,
        client_id: env.xClientId,
      }),
      cache: 'no-store',
    })
    const tokenBody = (await tokenRes.json().catch(() => null)) as { access_token?: string } | null
    if (!tokenRes.ok || !tokenBody?.access_token) {
      console.error('[solcierge] X token exchange failed:', tokenRes.status)
      return profileRedirect(request, 'failed')
    }
    accessToken = tokenBody.access_token
  } catch (error) {
    console.error('[solcierge] X token exchange error:', error)
    return profileRedirect(request, 'failed')
  }

  try {
    const meRes = await fetch(X_ME_URL, { headers: { authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
    const profile = parseMe(await meRes.json().catch(() => null))
    if (!meRes.ok || !profile) {
      console.error('[solcierge] X users/me failed:', meRes.status)
      return profileRedirect(request, 'failed')
    }

    const { error } = await supabaseAdmin()
      .from('users')
      .update({
        x_user_id: profile.id,
        x_username: profile.username,
        x_name: profile.name,
        x_avatar_url: profile.avatarUrl,
        x_linked_at: new Date().toISOString(),
      })
      .eq('id', viewer.id)
    if (error?.code === '23505') return profileRedirect(request, 'taken')
    if (error) throw new Error(error.message)

    return profileRedirect(request, 'connected')
  } catch (error) {
    console.error('[solcierge] X connect error:', error)
    return profileRedirect(request, 'failed')
  } finally {
    // Best effort, after the redirect is sent. The token is short-lived anyway, but
    // holding nothing is the point.
    after(() =>
      fetch(X_REVOKE_URL, {
        method: 'POST',
        headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: accessToken, token_type_hint: 'access_token', client_id: env.xClientId }),
      }).catch(() => undefined),
    )
  }
}

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { isCrossSiteWrite } from '@/lib/origin'
import { CODE_IN_PATH, REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE } from '@/lib/referrals'

/**
 * Keeps the Supabase Auth session alive for the email fallback.
 *
 * Server components cannot write cookies, so a refreshed token would otherwise be
 * discarded and a magic-link session would expire after an hour. Touching getUser()
 * here lets the refreshed cookie ride out on the response.
 *
 * Wallet sessions do not need this: that cookie is our own signed JWT with a 30 day
 * expiry and no refresh step.
 */
export async function middleware(request: NextRequest) {
  // CSRF backstop: refuse state-changing API calls the browser marks as cross-origin.
  if (
    request.nextUrl.pathname.startsWith('/api/') &&
    isCrossSiteWrite({
      method: request.method,
      origin: request.headers.get('origin'),
      host: request.headers.get('host') ?? request.nextUrl.host,
      secFetchSite: request.headers.get('sec-fetch-site'),
    })
  ) {
    return NextResponse.json({ error: 'Cross-site requests are not accepted.' }, { status: 403 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return withReferral(request, NextResponse.next())

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet: { name: string; value: string; options?: CookieOptions }[]) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  try {
    await supabase.auth.getUser()
  } catch {
    // An unreachable or unconfigured Supabase must not take the whole site down.
  }

  return withReferral(request, response)
}

/**
 * A share link (/r/<code>) remembers its code for 30 days, so the account the
 * visitor eventually opens is credited to whoever shared it. First link wins: a
 * second link does not take over an introduction already made. Only the shape is
 * checked here; the code is looked up when the account is created.
 */
function withReferral(request: NextRequest, response: NextResponse): NextResponse {
  const match = request.nextUrl.pathname.match(CODE_IN_PATH)
  if (!match || request.cookies.get(REFERRAL_COOKIE)) return response
  response.cookies.set(REFERRAL_COOKIE, match[1].toLowerCase(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: REFERRAL_COOKIE_MAX_AGE,
  })
  return response
}

export const config = {
  // Skip static assets and the image files: running auth on every .jpg is wasted work.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|media/).*)'],
}

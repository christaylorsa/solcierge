import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.next()

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

  return response
}

export const config = {
  // Skip static assets and the image files: running auth on every .jpg is wasted work.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|media/).*)'],
}

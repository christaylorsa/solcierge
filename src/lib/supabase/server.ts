import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { publicEnv } from '@/lib/env'

/**
 * Anon client wired to the request's cookies. Used only to read the Supabase Auth
 * session for the email fallback: it grants no table access (RLS denies anon),
 * it just tells us which email is signed in.
 */
export async function supabaseRouteClient() {
  const cookieStore = await cookies()
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet: { name: string; value: string; options?: CookieOptions }[]) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a server component, where cookies are read-only.
          // Token refresh is handled by the middleware instead.
        }
      },
    },
  })
}

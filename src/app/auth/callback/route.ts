import { NextResponse } from 'next/server'
import { safeNextPath } from '@/lib/redirect'
import { supabaseRouteClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Magic-link landing. Exchanges the code for a session, then drops the member into their bookings. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  // Same-site paths only: `//evil.example` would otherwise resolve off-site (SA-10).
  const next = safeNextPath(url.searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(new URL('/account?auth=missing-code', url.origin))
  }

  try {
    const supabase = await supabaseRouteClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/account?auth=link-expired', url.origin))
    }
  } catch {
    return NextResponse.redirect(new URL('/account?auth=failed', url.origin))
  }

  return NextResponse.redirect(new URL(next, url.origin))
}

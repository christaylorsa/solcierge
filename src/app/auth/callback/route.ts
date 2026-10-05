import { NextResponse } from 'next/server'
import { supabaseRouteClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Magic-link landing. Exchanges the code for a session, then drops the member into their bookings. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/account'

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

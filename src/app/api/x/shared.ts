import { NextResponse } from 'next/server'

export const X_OAUTH_COOKIE = 'solcierge_x_oauth'

export type XOutcome = 'connected' | 'cancelled' | 'expired' | 'taken' | 'failed' | 'signin' | 'busy' | 'unavailable'

/** Back to the profile, with the outcome in the query so the page can say what happened. */
export function profileRedirect(request: Request, outcome: XOutcome): NextResponse {
  const response = NextResponse.redirect(new URL(`/account/profile?x=${outcome}#connections`, request.url))
  response.cookies.delete({ name: X_OAUTH_COOKIE, path: '/api/x' })
  return response
}

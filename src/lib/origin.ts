/**
 * CSRF backstop for the API (SA-14).
 *
 * Session cookies are SameSite=Lax, which already keeps them off cross-site POSTs.
 * This closes what Lax does not cover (a same-site sibling subdomain, a browser that
 * ignores SameSite) by refusing any state-changing request the browser itself labels
 * as coming from another origin. Requests with neither header (curl, server-to-server)
 * carry no victim's cookies and pass. Import-free so it is unit-tested.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isCrossSiteWrite(input: {
  method: string
  origin: string | null
  host: string | null
  secFetchSite: string | null
}): boolean {
  if (SAFE_METHODS.has(input.method.toUpperCase())) return false
  if (input.secFetchSite && input.secFetchSite !== 'same-origin' && input.secFetchSite !== 'none') return true
  if (input.origin) {
    try {
      return new URL(input.origin).host !== input.host
    } catch {
      return true // "null" (sandboxed frames, some redirects) or garbage
    }
  }
  return false
}

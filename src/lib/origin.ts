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

/**
 * One host for the whole site. www.solcierge.xyz used to serve the site as well, but every
 * round trip that leaves and comes back (X's OAuth callback, email sign-in links, document
 * downloads) returns to the configured site URL, which is the bare domain, where a www
 * visitor's session and OAuth cookies do not exist. Takes the Host header (request.url
 * does not always carry it) and returns the bare-domain URL to redirect to, or null when
 * the request is already on a canonical host.
 */
export function canonicalRedirect(host: string | null, requestUrl: string): string | null {
  if (!host || !host.toLowerCase().startsWith('www.')) return null
  const url = new URL(requestUrl)
  const [hostname, port] = host.slice('www.'.length).split(':')
  url.hostname = hostname
  url.port = port ?? '' // setting only the hostname would keep an internal port
  return url.toString()
}

/**
 * SA-15 regression: every response carries the hardening headers.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'

test('next.config sends the security headers on every path', async () => {
  // Loaded by URL so TypeScript does not try to type the plain-JS config.
  const configUrl = new URL('../../next.config.mjs', import.meta.url).href
  const config = (await import(configUrl)).default as {
    headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>
    poweredByHeader?: boolean
  }
  const rules = await config.headers()
  const all = rules.find((rule) => rule.source === '/:path*')
  assert.ok(all, 'a catch-all header rule exists')

  const get = (key: string) => all.headers.find((header) => header.key === key)?.value
  assert.match(get('Content-Security-Policy') ?? '', /frame-ancestors 'none'/)
  assert.match(get('Content-Security-Policy') ?? '', /object-src 'none'/)
  assert.equal(get('X-Frame-Options'), 'DENY')
  assert.equal(get('X-Content-Type-Options'), 'nosniff')
  assert.equal(get('Referrer-Policy'), 'strict-origin-when-cross-origin')
  assert.equal(config.poweredByHeader, false)
})

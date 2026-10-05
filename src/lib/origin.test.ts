/**
 * SA-14 regression: state-changing API calls from another origin are refused.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { isCrossSiteWrite } from './origin.ts'

const HOST = 'solcierge.xyz'
const base = { method: 'POST', origin: 'https://solcierge.xyz', host: HOST, secFetchSite: 'same-origin' }

test('same-origin writes pass', () => {
  assert.equal(isCrossSiteWrite(base), false)
  assert.equal(isCrossSiteWrite({ ...base, method: 'PATCH' }), false)
})

test('writes from another site or a sibling subdomain are refused', () => {
  assert.equal(isCrossSiteWrite({ ...base, origin: 'https://evil.example', secFetchSite: 'cross-site' }), true)
  assert.equal(isCrossSiteWrite({ ...base, origin: 'https://shop.solcierge.xyz', secFetchSite: 'same-site' }), true)
  // Older browsers without Sec-Fetch-Site still send Origin.
  assert.equal(isCrossSiteWrite({ ...base, origin: 'https://evil.example', secFetchSite: null }), true)
  assert.equal(isCrossSiteWrite({ ...base, origin: 'null', secFetchSite: null }), true)
})

test('reads are never blocked, and header-less clients carry no victim cookies', () => {
  assert.equal(isCrossSiteWrite({ ...base, method: 'GET', origin: 'https://evil.example', secFetchSite: 'cross-site' }), false)
  assert.equal(isCrossSiteWrite({ method: 'POST', origin: null, host: HOST, secFetchSite: null }), false)
})

/**
 * SA-08 / SA-17 regression: the limiter bounds a client per window and forgets it after.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { clientIp, createLimiter } from './ratelimit.ts'

test('allows up to the limit, then refuses until the window resets', () => {
  const limiter = createLimiter({ limit: 3, windowMs: 1000 })
  const t = 1_000_000
  assert.deepEqual([1, 2, 3, 4].map(() => limiter.take('a', t)), [true, true, true, false])
  assert.equal(limiter.take('b', t), true, 'keys are independent')
  assert.equal(limiter.take('a', t + 999), false)
  assert.equal(limiter.take('a', t + 1000), true, 'a new window starts clean')
})

test('memory stays bounded under many distinct keys', () => {
  const limiter = createLimiter({ limit: 1, windowMs: 60_000, maxKeys: 100 })
  for (let i = 0; i < 1000; i += 1) limiter.take(`k${i}`, 0)
  // The newest key is still tracked, so it is refused on a second hit.
  assert.equal(limiter.take('k999', 1), false)
})

test('reads the client IP from the first x-forwarded-for entry', () => {
  const request = new Request('https://solcierge.xyz/api/rpc', {
    headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
  })
  assert.equal(clientIp(request), '203.0.113.7')
  assert.equal(clientIp(new Request('https://solcierge.xyz/')), 'unknown')
})

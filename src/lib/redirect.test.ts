/**
 * SA-10 regression: the magic-link callback only redirects within the site.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { safeNextPath } from './redirect.ts'

const ORIGIN = 'https://solcierge.xyz'

test('same-site paths pass through', () => {
  assert.equal(safeNextPath('/account'), '/account')
  assert.equal(safeNextPath('/account/abc?new=1#pay'), '/account/abc?new=1#pay')
})

test('anything that would leave the site falls back', () => {
  for (const next of [
    '//evil.example',
    'https://evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    'javascript:alert(1)',
    '/\tevil',
    'evil.example',
    '',
    null,
  ]) {
    const path = safeNextPath(next)
    assert.equal(path, '/account', String(next))
    assert.equal(new URL(path, ORIGIN).origin, ORIGIN)
  }
})

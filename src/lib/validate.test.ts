/**
 * SA-16 regression: ids and wallet addresses are shape-checked before use.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { isSolanaAddress, isUuid } from './validate.ts'

test('uuids', () => {
  assert.equal(isUuid('11111111-1111-4111-8111-111111111111'), true)
  for (const junk of ['1', "1' or '1'='1", '11111111-1111-4111-8111-11111111111g', null, 42]) {
    assert.equal(isUuid(junk), false, String(junk))
  }
})

test('solana addresses', () => {
  assert.equal(isSolanaAddress('BjLXvvJpub8JmobeYrsGXSHTvDjrsCC2Ho91sFWDm7KF'), true)
  for (const junk of ['x'.repeat(5000), 'not-base58-0OIl', '1111', 'BjLXvvJpub8JmobeYrsGXSHTvDjrsCC2Ho91sFWDm7KFF', 5, null]) {
    assert.equal(isSolanaAddress(junk), false, String(junk).slice(0, 20))
  }
})

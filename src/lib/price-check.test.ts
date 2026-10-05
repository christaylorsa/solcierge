/**
 * SA-09 regression: a SOL price only sets a lock when the feeds agree.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { reconcilePrices } from './price-check.ts'

test('agreeing feeds lock at the primary price', () => {
  assert.deepEqual(reconcilePrices(150, 151), { usd: 150, from: 'primary' })
})

test('feeds more than 2% apart refuse the lock', () => {
  const result = reconcilePrices(150, 300)
  assert.equal('error' in result, true)
  // A bad print in either direction is caught.
  assert.equal('error' in reconcilePrices(15, 150), true)
  assert.equal('error' in reconcilePrices(153.1, 150), true)
  assert.equal('error' in reconcilePrices(152.9, 150), false)
})

test('one feed down: the other is used alone', () => {
  assert.deepEqual(reconcilePrices(null, 150), { usd: 150, from: 'secondary' })
  assert.deepEqual(reconcilePrices(150, null), { usd: 150, from: 'primary' })
})

test('junk is treated as no answer', () => {
  assert.deepEqual(reconcilePrices(Number.NaN, 150), { usd: 150, from: 'secondary' })
  assert.deepEqual(reconcilePrices(0, -1), { error: 'no feed returned a usable price' })
})

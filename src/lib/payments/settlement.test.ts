/**
 * SA-05 regression: a proven transfer settles a booking automatically only against
 * the live lock on the live quote of a booking that is still waiting for payment.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { decideSettlement, type SettlementInput } from './settlement.ts'

const LIVE: SettlementInput = {
  bookingStatus: 'quoted',
  intentStatus: 'open',
  intentQuoteId: 'quote-2',
  currentQuoteId: 'quote-2',
  blockTime: 1_800_000_100,
  lockExpiresAt: 1_800_000_600,
  graceSeconds: 300,
}

test('the live lock on the live quote settles automatically', () => {
  assert.deepEqual(decideSettlement(LIVE), { kind: 'paid' })
})

test('a lock taken against a superseded quote goes to review', () => {
  // The desk re-quoted upward; the member paid the old, lower lock.
  const result = decideSettlement({ ...LIVE, intentQuoteId: 'quote-1' })
  assert.equal(result.kind, 'review')
})

test('a cancelled or withdrawn booking is never promoted to paid', () => {
  for (const bookingStatus of ['cancelled', 'pending', 'fulfilled']) {
    assert.equal(decideSettlement({ ...LIVE, bookingStatus }).kind, 'review', bookingStatus)
  }
})

test('an expired or already-consumed lock goes to review', () => {
  assert.equal(decideSettlement({ ...LIVE, intentStatus: 'expired' }).kind, 'review')
  assert.equal(decideSettlement({ ...LIVE, intentStatus: 'consumed' }).kind, 'review')
})

test('a transfer landing after the lock and its grace goes to review', () => {
  assert.equal(decideSettlement({ ...LIVE, blockTime: 1_800_000_600 + 300 }).kind, 'paid')
  assert.equal(decideSettlement({ ...LIVE, blockTime: 1_800_000_600 + 301 }).kind, 'review')
})

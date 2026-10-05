/**
 * SA-18 regression: the pay panel never sends from a wallet the server will reject.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { payingWalletProblem } from './pay-guard.ts'

const SIGNED_IN = 'BjLXvvJpub8JmobeYrsGXSHTvDjrsCC2Ho91sFWDm7KF'
const OTHER = 'AH54dJmxE3g4eukP68PexVNjWtEYXN8eob2jcfTRUTDF'

test('the signed-in wallet may pay', () => {
  assert.equal(payingWalletProblem(SIGNED_IN, SIGNED_IN), null)
})

test('a switched account is stopped before any transfer is built', () => {
  assert.match(payingWalletProblem(OTHER, SIGNED_IN) ?? '', /Switch back to BjLX…m7KF/)
})

test('a wallet that has not signed in yet is stopped', () => {
  assert.match(payingWalletProblem(OTHER, null) ?? '', /sign-in message/)
})

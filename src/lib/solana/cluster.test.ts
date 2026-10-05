/**
 * SA-06 regression: an RPC endpoint on the wrong cluster is caught before any
 * transaction from it is trusted.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { GENESIS_HASHES, clusterMismatch } from './cluster.ts'

test('an endpoint on the configured cluster passes', () => {
  assert.equal(clusterMismatch('mainnet-beta', GENESIS_HASHES['mainnet-beta']), null)
  assert.equal(clusterMismatch('devnet', GENESIS_HASHES.devnet), null)
})

test('a devnet endpoint behind a mainnet deployment is refused, and named', () => {
  const problem = clusterMismatch('mainnet-beta', GENESIS_HASHES.devnet)
  assert.match(problem ?? '', /on devnet, but NEXT_PUBLIC_SOLANA_CLUSTER is mainnet-beta/)
})

test('an unknown network (a local validator, a fork) is refused', () => {
  assert.match(clusterMismatch('mainnet-beta', '11111111111111111111111111111111') ?? '', /unknown cluster/)
})

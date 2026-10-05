/**
 * SA-08: the RPC proxy forwards only the pay flow's methods, in small batches.
 * (The session and rate-limit gates live in the route; the limiter is tested in
 * ratelimit.test.ts.)
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { checkRpcBody } from './rpc-policy.ts'

const call = (method: string) => ({ jsonrpc: '2.0', id: 1, method, params: [] })

test('forwards an allow-listed call unchanged', () => {
  const raw = JSON.stringify(call('getLatestBlockhash'))
  assert.deepEqual(checkRpcBody(raw), { raw })
})

test('refuses methods that scan or enumerate', () => {
  for (const method of ['getProgramAccounts', 'getSignaturesForAddress', 'requestAirdrop', 'getTransaction']) {
    const result = checkRpcBody(JSON.stringify(call(method)))
    assert.equal('error' in result && result.status, 403, method)
  }
})

test('refuses a batch that hides one disallowed call', () => {
  const result = checkRpcBody(JSON.stringify([call('getSlot'), call('getProgramAccounts')]))
  assert.equal('error' in result && result.status, 403)
})

test('refuses oversized batches, bodies and junk', () => {
  const batch = Array.from({ length: 11 }, () => call('getSlot'))
  assert.equal('error' in checkRpcBody(JSON.stringify(batch)), true)
  assert.equal('error' in checkRpcBody('x'.repeat(64 * 1024 + 1)), true)
  assert.equal('error' in checkRpcBody('not json'), true)
  assert.equal('error' in checkRpcBody('[]'), true)
})

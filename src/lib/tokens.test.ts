/**
 * SA-13 regression: session and challenge tokens cannot stand in for each other,
 * only HS256 is accepted, and a short secret is refused.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { SignJWT } from 'jose'
import { signToken, verifyToken } from './tokens.ts'

const SECRET = 'k'.repeat(44)
const claims = { wallet: 'BjLXvvJpub8JmobeYrsGXSHTvDjrsCC2Ho91sFWDm7KF', userId: 'u1' }

test('a session token verifies as a session', async () => {
  const token = await signToken('session', claims, 60, SECRET)
  const payload = await verifyToken('session', token, SECRET)
  assert.equal(payload?.wallet, claims.wallet)
})

test('tokens of one kind are refused as the other', async () => {
  const nonce = await signToken('siws-nonce', { ...claims, nonce: 'n' }, 60, SECRET)
  const session = await signToken('session', claims, 60, SECRET)
  assert.equal(await verifyToken('session', nonce, SECRET), null)
  assert.equal(await verifyToken('siws-nonce', session, SECRET), null)
})

test('a token without our audience (as issued before this fix) is refused', async () => {
  const legacy = await new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('60s').sign(new TextEncoder().encode(SECRET))
  assert.equal(await verifyToken('session', legacy, SECRET), null)
})

test('only HS256 is accepted, even with the right secret and audience', async () => {
  const hs512 = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS512' })
    .setAudience('solcierge:session')
    .setExpirationTime('60s')
    .sign(new TextEncoder().encode(SECRET))
  assert.equal(await verifyToken('session', hs512, SECRET), null)
})

test('a forged or expired token is refused', async () => {
  const forged = await signToken('session', claims, 60, 'x'.repeat(44))
  assert.equal(await verifyToken('session', forged, SECRET), null)
  const expired = await signToken('session', claims, -10, SECRET)
  assert.equal(await verifyToken('session', expired, SECRET), null)
})

test('a secret under 32 characters is refused outright', async () => {
  await assert.rejects(signToken('session', claims, 60, 'short'), /at least 32/)
})

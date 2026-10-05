/**
 * SA-07 regression: the sign-in message is bound to the issuing domain, so a
 * signature collected on another site does not verify here.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import nacl from 'tweetnacl'
import { signInMessage, siwsChainId, type SignInFields } from './siws.ts'

const keypair = nacl.sign.keyPair()

const FIELDS: SignInFields = {
  domain: 'solcierge.xyz',
  address: 'BjLXvvJpub8JmobeYrsGXSHTvDjrsCC2Ho91sFWDm7KF',
  uri: 'https://solcierge.xyz',
  chainId: 'mainnet',
  nonce: '3f1c9a7e0b2d4c6e8a1f3b5d7c9e0a2b',
  issuedAt: '2026-10-05T12:00:00.000Z',
  expirationTime: '2026-10-05T12:05:00.000Z',
}

const sign = (text: string) => nacl.sign.detached(new TextEncoder().encode(text), keypair.secretKey)
const verifies = (text: string, signature: Uint8Array) =>
  nacl.sign.detached.verify(new TextEncoder().encode(text), signature, keypair.publicKey)

test('the message follows the SIWS layout wallets parse', () => {
  const lines = signInMessage(FIELDS).split('\n')
  assert.equal(lines[0], 'solcierge.xyz wants you to sign in with your Solana account:')
  assert.equal(lines[1], FIELDS.address)
  assert.equal(lines[2], '')
  assert.equal(lines[4], '')
  assert.deepEqual(lines.slice(5), [
    'URI: https://solcierge.xyz',
    'Version: 1',
    'Chain ID: mainnet',
    `Nonce: ${FIELDS.nonce}`,
    'Issued At: 2026-10-05T12:00:00.000Z',
    'Expiration Time: 2026-10-05T12:05:00.000Z',
  ])
  // SIWS statements are a single line.
  assert.equal(lines[3].includes('\n'), false)
})

test('a signature over our challenge verifies against the server-rebuilt text', () => {
  const signature = sign(signInMessage(FIELDS))
  assert.equal(verifies(signInMessage({ ...FIELDS }), signature), true)
})

test('a signature collected under another domain does not verify here', () => {
  const phished = sign(signInMessage({ ...FIELDS, domain: 'solcierge-login.example', uri: 'https://solcierge-login.example' }))
  assert.equal(verifies(signInMessage(FIELDS), phished), false)
})

test('cluster names map to SIWS chain ids', () => {
  assert.equal(siwsChainId('mainnet-beta'), 'mainnet')
  assert.equal(siwsChainId('devnet'), 'devnet')
})

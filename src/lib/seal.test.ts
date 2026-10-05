import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seal, unseal } from './seal.ts'

const SECRET = 's'.repeat(40)

test('a sealed value round-trips and hides its content', () => {
  const value = [{ full_name: 'Ada Lovelace', passport_number: 'X1234567' }]
  const sealed = seal(value, SECRET)
  assert.ok(!sealed.includes('Lovelace'))
  assert.ok(!sealed.includes('X1234567'))
  assert.deepEqual(unseal(sealed, SECRET), value)
})

test('each seal uses a fresh nonce', () => {
  assert.notEqual(seal({ a: 1 }, SECRET), seal({ a: 1 }, SECRET))
})

test('another secret or a tampered value reads as null', () => {
  const sealed = seal({ a: 1 }, SECRET)
  assert.equal(unseal(sealed, 't'.repeat(40)), null)
  const parts = sealed.split('.')
  parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith('AA') ? 'BB' : 'AA')
  assert.equal(unseal(parts.join('.'), SECRET), null)
  assert.equal(unseal('garbage', SECRET), null)
})

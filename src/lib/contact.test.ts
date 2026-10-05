/**
 * SA-02 regression: a typed contact email never becomes a login identity.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { contactRecord } from './contact.ts'

test('a contact email is kept on the request, never patched onto the user', () => {
  const { details, userPatch } = contactRecord({ contact_email: 'Victim@Example.com' }, { name: null })
  assert.equal(details.contact_email, 'victim@example.com')
  assert.equal('email' in userPatch, false)
  assert.equal(userPatch.contact_email, 'victim@example.com')
})

test('a typed email fills an empty profile contact email only', () => {
  assert.equal(contactRecord({ contact_email: 'a@b.co' }, { name: null, contact_email: 'c@d.co' }).userPatch.contact_email, undefined)
})

test('a contact name fills an empty profile name only', () => {
  assert.deepEqual(contactRecord({ contact_name: 'Ada' }, { name: null }).userPatch, { name: 'Ada' })
  assert.deepEqual(contactRecord({ contact_name: 'Ada' }, { name: 'Grace' }).userPatch, {})
})

test('nothing typed, nothing stored', () => {
  assert.deepEqual(contactRecord({}, { name: null }), { details: {}, userPatch: {} })
})

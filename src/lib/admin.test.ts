/**
 * SA-01 regression: operator rights come only from the identity the session proved.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { isAdminIdentity } from './admin.ts'

const ADMIN_WALLET = 'AH54dJmxE3g4eukP68PexVNjWtEYXN8eob2jcfTRUTDF'
const MEMBER_WALLET = 'BjLXvvJpub8JmobeYrsGXSHTvDjrsCC2Ho91sFWDm7KF'
const allow = { wallets: [ADMIN_WALLET], emails: ['desk@solcierge.xyz'] }

test('an allow-listed wallet session is an operator', () => {
  assert.equal(isAdminIdentity({ kind: 'wallet', wallet: ADMIN_WALLET }, allow), true)
})

test('a wallet session is never promoted by an email, whatever the users row says', () => {
  // The identity type has no room for the row's email: a member who typed an admin
  // address as their contact email is still judged on their wallet alone.
  assert.equal(isAdminIdentity({ kind: 'wallet', wallet: MEMBER_WALLET }, allow), false)
})

test('a verified email session is matched case-insensitively', () => {
  assert.equal(isAdminIdentity({ kind: 'email', email: 'Desk@Solcierge.xyz' }, allow), true)
  assert.equal(isAdminIdentity({ kind: 'email', email: 'someone@else.com' }, allow), false)
})

test('empty allowlists admit nobody', () => {
  const none = { wallets: [], emails: [] }
  assert.equal(isAdminIdentity({ kind: 'wallet', wallet: ADMIN_WALLET }, none), false)
  assert.equal(isAdminIdentity({ kind: 'email', email: 'desk@solcierge.xyz' }, none), false)
})

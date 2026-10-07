import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CODE_IN_PATH, checkCode, displayCode, generateCode, referralUrl, shareOnXUrl } from './referrals.ts'

test('codes are stored lowercase, without a leading @', () => {
  assert.deepEqual(checkCode('  @ChrisT '), { ok: true, code: 'christ' })
  assert.deepEqual(checkCode('gold-coast-7'), { ok: true, code: 'gold-coast-7' })
})

test('bad codes are refused with a reason', () => {
  for (const bad of ['ab', 'a'.repeat(21), '-abc', 'abc-', 'ab--cd', 'has space', 'émile', 'ab_cd', 42, null]) {
    assert.equal(checkCode(bad).ok, false, String(bad))
  }
})

test('house words are reserved', () => {
  for (const reserved of ['solcierge', 'DESK', 'support', 'admin-1', 'official']) {
    assert.equal(checkCode(reserved).ok, false, reserved)
  }
  assert.equal(checkCode('deskhand').ok, true)
})

test('generated codes pass validation and avoid lookalikes', () => {
  for (let i = 0; i < 200; i++) {
    const code = generateCode()
    assert.equal(checkCode(code).ok, true, code)
    assert.doesNotMatch(code, /[01ilo]/)
  }
})

test('the middleware path pattern matches share links only', () => {
  assert.equal('/r/CHRIS'.match(CODE_IN_PATH)?.[1], 'CHRIS')
  assert.equal('/r/gold-coast/'.match(CODE_IN_PATH)?.[1], 'gold-coast')
  assert.equal('/r/CHRIS/extra'.match(CODE_IN_PATH), null)
  assert.equal('/r/a'.match(CODE_IN_PATH), null)
})

test('links show the code uppercase and the X intent carries the link', () => {
  assert.equal(displayCode('christ'), 'CHRIST')
  assert.equal(referralUrl('https://solcierge.xyz/', 'christ'), 'https://solcierge.xyz/r/CHRIST')
  const intent = new URL(shareOnXUrl('https://solcierge.xyz', 'christ'))
  assert.equal(intent.hostname, 'x.com')
  assert.equal(intent.searchParams.get('url'), 'https://solcierge.xyz/r/CHRIST')
})

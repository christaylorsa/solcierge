import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newLinkCode, parseCommand, secretMatches, webhookSecret } from './telegram.ts'

test('link codes fit Telegram start parameters', () => {
  const code = newLinkCode()
  assert.match(code, /^[A-Za-z0-9_-]{24}$/)
  assert.notEqual(code, newLinkCode())
})

test('/start carries a well-formed code, or none', () => {
  const code = newLinkCode()
  assert.deepEqual(parseCommand(`/start ${code}`), { command: 'start', code })
  assert.deepEqual(parseCommand(`/start@SolciergeDeskbot ${code}`), { command: 'start', code })
  assert.deepEqual(parseCommand('/start'), { command: 'start', code: null })
  assert.deepEqual(parseCommand('/start not-a-code'), { command: 'start', code: null })
})

test('/stop is recognised and everything else ignored', () => {
  assert.deepEqual(parseCommand('/STOP'), { command: 'stop' })
  assert.equal(parseCommand('hello'), null)
  assert.equal(parseCommand(undefined), null)
})

test('the webhook secret is stable, Telegram-safe and compared exactly', () => {
  const secret = webhookSecret('x'.repeat(40))
  assert.equal(secret, webhookSecret('x'.repeat(40)))
  assert.notEqual(secret, webhookSecret('y'.repeat(40)))
  assert.match(secret, /^[A-Za-z0-9_-]{1,256}$/)
  assert.equal(secretMatches(secret, secret), true)
  assert.equal(secretMatches(`${secret}0`, secret), false)
  assert.equal(secretMatches(null, secret), false)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TIERS, lifetimeSpend, standing, tierFor } from './tiers.ts'

test('tiers open at their thresholds', () => {
  assert.equal(tierFor(0).key, 'member')
  assert.equal(tierFor(24_999.99).key, 'member')
  assert.equal(tierFor(25_000).key, 'reserve')
  assert.equal(tierFor(99_999).key, 'reserve')
  assert.equal(tierFor(100_000).key, 'black')
  assert.equal(tierFor(5_000_000).key, 'black')
})

test('nonsense spend counts as nothing', () => {
  assert.equal(tierFor(-10).key, 'member')
  assert.equal(tierFor(Number.NaN).key, 'member')
})

test('standing says how far the next tier is', () => {
  assert.deepEqual(
    { key: standing(6_600).tier.key, next: standing(6_600).next?.key, toNext: standing(6_600).toNext },
    { key: 'member', next: 'reserve', toNext: 18_400 },
  )
  const top = standing(250_000)
  assert.equal(top.tier.key, 'black')
  assert.equal(top.next, null)
  assert.equal(top.toNext, null)
})

test('thresholds climb', () => {
  for (let i = 1; i < TIERS.length; i++) assert.ok(TIERS[i].from > TIERS[i - 1].from)
  assert.equal(TIERS[0].from, 0)
})

test('only settled bookings count towards spend', () => {
  const spend = lifetimeSpend([
    { status: 'paid', quote: { amount_usd: '12000.50' } },
    { status: 'fulfilled', quote: { amount_usd: 8000 } },
    { status: 'quoted', quote: { amount_usd: 50_000 } },
    { status: 'cancelled', quote: { amount_usd: 90_000 } },
    { status: 'paid', quote: null },
  ])
  assert.equal(spend, 20_000.5)
})

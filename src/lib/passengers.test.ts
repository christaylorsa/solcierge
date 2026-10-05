import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkPassengers, expiresSoonAfter, lastTravelDate, maskPassport, purgeAfter } from './passengers.ts'

const TODAY = '2026-10-05'
const ADA = {
  full_name: '  Ada   Lovelace ',
  date_of_birth: '1990-12-10',
  nationality: 'gb',
  passport_number: '123 456-789',
  passport_expiry: '2030-01-01',
}

test('a valid passenger is cleaned up', () => {
  const result = checkPassengers([ADA], { today: TODAY, travelDate: '2026-10-22' })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(result.passengers[0], {
      full_name: 'Ada Lovelace',
      date_of_birth: '1990-12-10',
      nationality: 'GB',
      passport_number: '123456789',
      passport_expiry: '2030-01-01',
    })
  }
})

test('the first bad field is reported with its passenger', () => {
  const result = checkPassengers([ADA, { ...ADA, nationality: 'ZZ' }], { today: TODAY, travelDate: null })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.error.index, 1)
    assert.equal(result.error.field, 'nationality')
  }
})

test('impossible dates, future births and junk passports are refused', () => {
  const opts = { today: TODAY, travelDate: null }
  assert.equal(checkPassengers([{ ...ADA, date_of_birth: '1990-02-30' }], opts).ok, false)
  assert.equal(checkPassengers([{ ...ADA, date_of_birth: '2027-01-01' }], opts).ok, false)
  assert.equal(checkPassengers([{ ...ADA, passport_number: '12' }], opts).ok, false)
  assert.equal(checkPassengers([{ ...ADA, passport_number: '1234<script>' }], opts).ok, false)
  assert.equal(checkPassengers([{ ...ADA, full_name: 'A' }], opts).ok, false)
})

test('a passport must outlast the trip', () => {
  const result = checkPassengers([{ ...ADA, passport_expiry: '2026-10-20' }], { today: TODAY, travelDate: '2026-10-22' })
  assert.equal(result.ok, false)
  assert.equal(checkPassengers([{ ...ADA, passport_expiry: '2026-10-22' }], { today: TODAY, travelDate: '2026-10-22' }).ok, true)
})

test('empty and oversized lists are refused', () => {
  assert.equal(checkPassengers([], { today: TODAY, travelDate: null }).ok, false)
  assert.equal(checkPassengers('nope', { today: TODAY, travelDate: null }).ok, false)
  assert.equal(checkPassengers(Array(21).fill(ADA), { today: TODAY, travelDate: null }).ok, false)
})

test('six-month validity warning', () => {
  assert.equal(expiresSoonAfter('2027-03-01', '2026-10-22', TODAY), true)
  assert.equal(expiresSoonAfter('2027-06-01', '2026-10-22', TODAY), false)
})

test('the last travel date follows the trip type', () => {
  assert.equal(lastTravelDate({ trip: 'return', start_date: '2026-10-06', end_date: '2026-10-22' }), '2026-10-22')
  assert.equal(lastTravelDate({ trip: 'one_way', start_date: '2026-10-06', end_date: '2026-10-22' }), '2026-10-06')
  assert.equal(lastTravelDate({}), null)
})

test('manifests are purged 30 days after travel', () => {
  const now = new Date('2026-10-05T12:00:00Z')
  assert.equal(purgeAfter('2026-10-22', now).toISOString(), '2026-11-21T23:59:59.000Z')
  assert.equal(purgeAfter(null, now).toISOString(), '2026-12-04T12:00:00.000Z')
})

test('passports are masked to their last four', () => {
  assert.equal(maskPassport('123456789'), '•••••6789')
  assert.equal(maskPassport('123'), '••••')
})

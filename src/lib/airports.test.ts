/**
 * Tests for the airport search behind the jet route fields. Runs against the real
 * generated list, so a rebuild that drops a field a member would expect fails here.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { airportValue, buildIndex, searchAirports, type AirportRow } from './airports.ts'

const rows = JSON.parse(
  readFileSync(new URL('../../public/data/airports.json', import.meta.url), 'utf8'),
) as AirportRow[]
const index = buildIndex(rows)
const codes = (query: string) => searchAirports(index, query).map((airport) => airport.iata || airport.icao)

test('an exact IATA code comes first', () => {
  assert.equal(codes('nce')[0], 'NCE')
  assert.equal(codes('TEB')[0], 'TEB')
})

test('an exact ICAO code comes first', () => {
  assert.equal(codes('LFPB')[0], 'LBG')
})

test('a city finds its airports, large ones first', () => {
  const london = searchAirports(index, 'London')
  for (const code of ['LHR', 'LGW', 'STN', 'LCY']) {
    assert.ok(london.some((airport) => airport.iata === code), `London should list ${code}`)
  }
  assert.equal(london[0].size, 0)
})

test('a city finds business-aviation fields listed under it', () => {
  assert.ok(codes('New York').includes('TEB'), 'New York should list Teterboro')
})

test('accents are optional', () => {
  assert.ok(codes('zurich').includes('ZRH'))
  assert.ok(codes('sao paulo').includes('GRU'))
})

test('a single character returns nothing', () => {
  assert.deepEqual(searchAirports(index, 'n'), [])
})

test('the stored value names the airport, codes and place within the API limit', () => {
  const nice = searchAirports(index, 'NCE')[0]
  assert.match(airportValue(nice), /^Nice.*\(NCE \/ LFMN\), Nice.*France$/)
  for (const airport of index) assert.ok(airportValue(airport).length <= 120)
})

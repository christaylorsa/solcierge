/**
 * Location search for every category except flights. Runs against the real airport
 * list, the same file the browser loads, so the world-city fallback is tested too.
 *
 *   npm test
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildIndex, type AirportRow } from './airports.ts'
import {
  CATALOGUES,
  buildPlaceIndex,
  featuredPlaces,
  kindLabel,
  placeValue,
  searchPlaces,
  type PlaceCategory,
} from './places.ts'

const airports = buildIndex(
  JSON.parse(readFileSync(new URL('../../public/data/airports.json', import.meta.url), 'utf8')) as AirportRow[],
)

const names = (category: PlaceCategory, query: string, withCities = true) =>
  searchPlaces(buildPlaceIndex(category, withCities ? airports : null), query).map((place) => place.name)

test('every popular pick exists in its own category', () => {
  for (const category of Object.keys(CATALOGUES) as PlaceCategory[]) {
    const picks = featuredPlaces(category)
    assert.equal(picks.length, CATALOGUES[category].featured.length, category)
    assert.ok(picks.length >= 8, `${category} offers at least eight picks`)
  }
})

test('curated places come before world cities', () => {
  assert.equal(names('villas', 'myk')[0], 'Mykonos')
  assert.equal(names('cars', 'mon')[0], 'Monaco')
  assert.equal(names('yachts', 'french')[0], 'French Riviera')
})

test('other names find the place', () => {
  assert.equal(names('villas', 'st barts')[0], 'St Barths')
  assert.equal(names('villas', 'positano')[0], 'Amalfi Coast')
  assert.equal(names('cars', 'monte carlo')[0], 'Monaco')
  assert.equal(names('events', 'f1')[0].endsWith('Grand Prix'), true)
  assert.equal(names('dining', 'san sebastian')[0], 'San Sebastián')
})

test('several words match in any order', () => {
  const prix = names('events', 'grand prix')
  assert.ok(prix.length >= 5)
  assert.ok(prix.every((name) => name.endsWith('Grand Prix')))
  assert.equal(names('events', 'prix monaco')[0], 'Monaco Grand Prix')
  assert.equal(names('cars', 'london mayfair')[0], 'London')
})

test('accents do not matter', () => {
  assert.equal(names('villas', 'megeve')[0], 'Megève')
  assert.equal(names('cars', 'zurich')[0], 'Zurich')
})

test('a city with an airport is found anywhere in the world', () => {
  assert.ok(names('dining', 'leeds').includes('Leeds'))
  assert.ok(names('cars', 'lagos').includes('Lagos'))
  // Without the airport list loaded, only the curated list answers.
  assert.equal(names('dining', 'leeds', false).length, 0)
})

test('a curated place is not listed twice', () => {
  const hits = searchPlaces(buildPlaceIndex('cars', airports), 'dubai')
  assert.equal(hits.filter((place) => place.name === 'Dubai').length, 1)
})

test('picked places become readable request text', () => {
  const [mykonos] = searchPlaces(buildPlaceIndex('villas'), 'mykonos')
  assert.equal(placeValue(mykonos), 'Mykonos, Greece')
  const [monaco] = searchPlaces(buildPlaceIndex('events'), 'monaco grand')
  assert.equal(placeValue(monaco), 'Monaco Grand Prix · Circuit de Monaco, Monte Carlo')
  assert.equal(kindLabel(monaco), 'Event · usually May')
  for (const category of Object.keys(CATALOGUES) as PlaceCategory[]) {
    for (const place of CATALOGUES[category].places) assert.ok(placeValue(place).length <= 160, place.name)
  }
})

test('one letter is not a search', () => {
  assert.deepEqual(names('villas', 'm'), [])
})

/**
 * Solcierge Experiences: the data every experience page and request is built from.
 *
 *   npm test
 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import {
  EXPERIENCES,
  EXPERIENCE_REGIONS,
  EXPERIENCE_SLUGS,
  FEATURED_EXPERIENCES,
  experiencesIn,
  experienceName,
  isExperienceSlug,
  otherExperiences,
  trailingSpan,
} from './experiences.ts'

const publicFile = (path: string) => new URL(`../../public${path}`, import.meta.url)

test('every slug has exactly one experience, in order', () => {
  assert.deepEqual(
    EXPERIENCES.map((experience) => experience.slug),
    [...EXPERIENCE_SLUGS],
  )
})

test('every experience is complete and its photographs ship', () => {
  for (const experience of EXPERIENCES) {
    assert.ok(experience.bases.length >= 4, `${experience.slug} offers at least four bases`)
    assert.equal(experience.shape.length, 5, `${experience.slug} has a five-part shape`)
    assert.equal(experience.included.length, 6, `${experience.slug} lists six inclusions`)
    for (const image of [experience.image, experience.image2]) {
      assert.ok(existsSync(publicFile(image)), `${image} exists`)
    }
    assert.ok(experience.imageAlt && experience.image2Alt, `${experience.slug} has alt text`)
  }
})

test('nothing carries a price or a fixed date', () => {
  for (const experience of EXPERIENCES) {
    assert.doesNotMatch(JSON.stringify(experience), /\$\s?\d|USD|\b20\d\d\b/, experience.slug)
    assert.match(experience.season, /^Usually /, `${experience.slug} season reads as usual, not fixed`)
  }
})

test('names resolve only for real experiences', () => {
  assert.equal(experienceName('big-five-safari'), 'Big Five Safari')
  assert.equal(experienceName('moon-landing'), null)
  assert.equal(experienceName(undefined), null)
  assert.equal(isExperienceSlug('cape-town'), true)
  assert.equal(isExperienceSlug(42), false)
})

test('other experiences come from the same region and never repeat the one viewed', () => {
  for (const experience of EXPERIENCES) {
    const others = otherExperiences(experience.slug)
    assert.equal(others.length, 3)
    assert.ok(!others.some((other) => other.slug === experience.slug), experience.slug)
    assert.equal(new Set(others.map((other) => other.slug)).size, 3)
    assert.ok(others.every((other) => other.region === experience.region), experience.slug)
  }
})

test('everything comes in rows of three', () => {
  // The grid is three a row: every region, the full list and the home page six.
  for (const region of EXPERIENCE_REGIONS) {
    const count = experiencesIn(region).length
    assert.ok(count > 0 && count % 3 === 0, `${region} has ${count}, not a multiple of three`)
  }
  assert.equal(EXPERIENCES.length % 3, 0)
  assert.equal(FEATURED_EXPERIENCES.length, 6)
})

test('the last card fills whatever the bottom row leaves', () => {
  // Two columns: an odd count stretches the last card across both.
  assert.equal(trailingSpan(10, 2), 1)
  assert.equal(trailingSpan(9, 2), 2)
  // Three columns: one left over takes the row, two left over share it 1 + 2.
  assert.equal(trailingSpan(9, 3), 1)
  assert.equal(trailingSpan(10, 3), 3)
  assert.equal(trailingSpan(5, 3), 2)
  for (const columns of [2, 3]) {
    for (let count = 1; count <= 12; count++) {
      const used = (count - 1) + trailingSpan(count, columns)
      assert.equal(used % columns, 0, `${count} cards in ${columns} columns leave no gap`)
    }
  }
})

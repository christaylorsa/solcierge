/**
 * Responsive photo copies: the paths the pages ask for, and that every one exists.
 * A failure here usually means a photo was added or replaced without running
 * `npm run photos`.
 *
 *   npm test
 */
import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import test from 'node:test'
import { EXPERIENCES } from './experiences.ts'
import { photoSrcSet, photoVariant, photoWidths, type PhotoCrop } from './photos.ts'

const publicFile = (path: string) => new URL(`../../public${path}`, import.meta.url)

test('copies sit under /media/v with the crop and width in the name', () => {
  assert.equal(
    photoVariant('/media/experiences/safari.jpg', 'portrait', 480, 'avif'),
    '/media/v/experiences/safari-portrait-480.avif',
  )
  assert.equal(photoVariant('/media/jets.jpg', 'landscape', 640, 'webp'), '/media/v/jets-640.webp')
  assert.deepEqual(photoWidths('landscape'), [640, 1024, 1600])
  assert.deepEqual(photoWidths('landscape', 1920), [640, 1024, 1600, 1920])
  assert.equal(photoSrcSet('/media/jets.jpg', 'portrait', 'webp').split(', ').length, 2)
})

test('every photo the pages show has all its copies', () => {
  const wanted: { src: string; crop: PhotoCrop; master: number }[] = []
  for (const experience of EXPERIENCES) {
    wanted.push({ src: experience.image, crop: 'landscape', master: 1920 })
    wanted.push({ src: experience.image, crop: 'portrait', master: 1920 })
    wanted.push({ src: experience.image2, crop: 'landscape', master: 1600 })
  }
  for (const file of readdirSync(publicFile('/media'))) {
    if (file.endsWith('.jpg') && file !== 'og.jpg') wanted.push({ src: `/media/${file}`, crop: 'landscape', master: 1600 })
  }

  for (const { src, crop, master } of wanted) {
    for (const width of photoWidths(crop, master)) {
      for (const format of ['avif', 'webp'] as const) {
        const path = photoVariant(src, crop, width, format)
        assert.ok(existsSync(publicFile(path)), `${path} is missing: run npm run photos`)
      }
    }
  }
})

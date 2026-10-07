/**
 * Writes the responsive copies of every photograph under public/media into
 * public/media/v/: AVIF and WebP at each width in src/lib/photos.ts, plus 3:4
 * portrait crops of the experience heroes, framed on each experience's `focus`.
 *
 * Skips anything already written and newer than its master, so re-running after
 * adding one photo only does that photo.
 *
 *   npm run photos
 */
import { mkdir, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { EXPERIENCES } from '../src/lib/experiences.ts'
import { photoVariant, photoWidths } from '../src/lib/photos.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const media = join(root, 'public', 'media')

// Not photographs on the page: the share image is read by other sites as a JPEG.
const SKIP = new Set(['og.jpg'])

// Settled by eye on the darkest frames, where banding shows first. The .photo
// filter darkens everything on the page anyway, so there is little to gain above these.
const QUALITY = { avif: 52, webp: 72 }

const focusOf = new Map(EXPERIENCES.map((experience) => [experience.image, experience.focus]))

async function masters(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'v') out.push(...(await masters(path)))
    else if (/\.jpe?g$/i.test(entry.name) && !SKIP.has(entry.name)) out.push(path)
  }
  return out
}

async function fresh(output, masterTime) {
  try {
    return (await stat(output)).mtimeMs >= masterTime
  } catch {
    return false
  }
}

let written = 0
for (const file of await masters(media)) {
  const src = `/${relative(join(root, 'public'), file).split('\\').join('/')}`
  const masterTime = (await stat(file)).mtimeMs
  const { width: masterWidth, height: masterHeight } = await sharp(file).metadata()

  const jobs = photoWidths('landscape', masterWidth).map((width) => ({ crop: 'landscape', width }))
  const focus = focusOf.get(src)
  if (focus) jobs.push(...photoWidths('portrait').map((width) => ({ crop: 'portrait', width })))

  for (const { crop, width } of jobs) {
    for (const format of ['avif', 'webp']) {
      const output = join(root, 'public', photoVariant(src, crop, width, format))
      if (await fresh(output, masterTime)) continue
      await mkdir(dirname(output), { recursive: true })

      let image = sharp(file)
      if (crop === 'portrait') {
        // Full height, 3:4, centred on the focus point and clamped to the frame.
        const cropWidth = Math.round((masterHeight * 3) / 4)
        const x = Number.parseFloat(focus) / 100
        const left = Math.min(Math.max(Math.round(masterWidth * x - cropWidth / 2), 0), masterWidth - cropWidth)
        image = image.extract({ left, top: 0, width: cropWidth, height: masterHeight })
      }
      image = image.resize({ width, withoutEnlargement: true })
      image = format === 'avif' ? image.avif({ quality: QUALITY.avif, effort: 6 }) : image.webp({ quality: QUALITY.webp, effort: 6 })
      await image.toFile(output)
      written++
    }
  }
}

console.log(`Wrote ${written} photo copies into public/media/v/`)

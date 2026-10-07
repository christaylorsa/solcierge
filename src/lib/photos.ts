/**
 * Responsive copies of the site's photographs.
 *
 * Every JPEG under public/media is the master. `scripts/build-photos.mjs` writes
 * AVIF and WebP copies of each at several widths into public/media/v/, plus 3:4
 * portrait crops for the experience cards, so a 380px card downloads a 40KB file
 * rather than a 400KB master. The masters stay for Open Graph and as the source of
 * truth: re-run the script after adding or replacing one.
 *
 *   npm run photos
 *
 * Import-free so the script and the unit tests can load it directly.
 */

/** Widths of the full-frame copies. Never wider than the master. */
export const LANDSCAPE_WIDTHS = [640, 1024, 1600, 1920] as const
/** Widths of the 3:4 portrait crops (experience cards, and phone heroes). */
export const PORTRAIT_WIDTHS = [480, 800] as const

export type PhotoFormat = 'avif' | 'webp'
export type PhotoCrop = 'landscape' | 'portrait'

/** Where a copy lives: /media/experiences/safari.jpg → /media/v/experiences/safari-portrait-480.avif */
export function photoVariant(src: string, crop: PhotoCrop, width: number, format: PhotoFormat): string {
  const stem = src.replace(/^\/media\//, '').replace(/\.jpe?g$/i, '')
  return `/media/v/${stem}${crop === 'portrait' ? '-portrait' : ''}-${width}.${format}`
}

/** The widths a master actually has copies at. */
export function photoWidths(crop: PhotoCrop, masterWidth = 1600): number[] {
  if (crop === 'portrait') return [...PORTRAIT_WIDTHS]
  return LANDSCAPE_WIDTHS.filter((width) => width <= masterWidth)
}

export function photoSrcSet(src: string, crop: PhotoCrop, format: PhotoFormat, masterWidth = 1600): string {
  return photoWidths(crop, masterWidth)
    .map((width) => `${photoVariant(src, crop, width, format)} ${width}w`)
    .join(', ')
}

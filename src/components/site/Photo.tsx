import type { CSSProperties } from 'react'
import { photoSrcSet, photoVariant, type PhotoCrop } from '@/lib/photos'

/**
 * A photograph from public/media, served as the smallest AVIF or WebP copy that
 * covers its box (see src/lib/photos.ts), never the master JPEG.
 *
 * `sizes` must describe the width the image needs, not the width of its box: an
 * object-cover image in a tall box needs to be wider than the box to fill its height.
 *
 * `narrow` swaps in the 3:4 portrait crop below a breakpoint, for heroes that are a
 * landscape panel on desktop and a tall full-bleed frame on a phone.
 */
export function Photo({
  src,
  alt,
  sizes,
  crop = 'landscape',
  masterWidth = 1600,
  narrow,
  className = '',
  style,
  loading = 'lazy',
  fetchPriority,
}: {
  src: string
  alt: string
  sizes: string
  crop?: PhotoCrop
  /** The master's width, so no srcset entry claims more pixels than exist. */
  masterWidth?: number
  narrow?: { media: string; sizes: string }
  className?: string
  style?: CSSProperties
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
}) {
  const fallbackWidth = crop === 'portrait' ? 800 : 1024
  return (
    // `contents` so the wrapper never takes part in layout: the img sizes against its own parent.
    <picture className="contents">
      {narrow ? (
        <>
          <source media={narrow.media} type="image/avif" srcSet={photoSrcSet(src, 'portrait', 'avif')} sizes={narrow.sizes} />
          <source media={narrow.media} type="image/webp" srcSet={photoSrcSet(src, 'portrait', 'webp')} sizes={narrow.sizes} />
        </>
      ) : null}
      <source type="image/avif" srcSet={photoSrcSet(src, crop, 'avif', masterWidth)} sizes={sizes} />
      <img
        src={photoVariant(src, crop, fallbackWidth, 'webp')}
        srcSet={photoSrcSet(src, crop, 'webp', masterWidth)}
        sizes={sizes}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        className={className}
        style={style}
      />
    </picture>
  )
}

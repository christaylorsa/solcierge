import Link from 'next/link'
import { Stagger } from '@/components/motion/Reveal'
import { Eyebrow, MaskedHeading } from '@/components/motion/MaskedHeading'
import { Tilt } from '@/components/motion/Magnetic'
import { Aurora } from '@/components/motion/Aurora'
import { Photo } from '@/components/site/Photo'
import { Section } from '@/components/site/Section'
import { CATEGORIES } from '@/lib/categories'

/**
 * Seven tiles on a three-column grid: the first and last span two, so the rows read
 * 2+1, 1+1+1, 1+2 with no hole at the end.
 */
const isWide = (index: number) => index === 0 || index === CATEGORIES.length - 1

/**
 * One hover gesture per card, composed of five moves that share the expo curve so they
 * read as a single response: the photograph pushes in, a scrim darkens over it, the
 * title lifts 4px, the CTA warms to gold and an arrow slides in from the left. Plus a
 * 4-degree tilt tracking the cursor.
 *
 * The moves are CSS (see the `.card-*` rules in globals.css) because they are two-state
 * transitions; only the tilt is Framer, because it tracks a continuous pointer position.
 */
export function CategoryTiles() {
  return (
    <Section id="categories" tone="surface" className="relative overflow-hidden">
      <Aurora />

      <div className="relative">
        <div className="max-w-2xl">
          <Eyebrow>What we book</Eyebrow>
          <MaskedHeading
            lines={['Seven ways to ask']}
            className="display mt-5 text-[clamp(2.25rem,5vw,3.5rem)] text-ink"
          />
          <p className="lede mt-6">
            Each one opens a short brief. The more specific you are, the faster the quote comes
            back, and the closer it lands to what you actually wanted.
          </p>
        </div>

        <Stagger className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category, index) => (
            <Tilt key={category.slug} className={isWide(index) ? 'lg:col-span-2' : ''}>
              <Link
                href={`/request/${category.slug}`}
                className="card group flex h-full flex-col overflow-hidden border border-line bg-bg"
              >
                {/* The wide crop only applies where the tile actually spans two columns. */}
                <div
                  className={`relative overflow-hidden ${
                    isWide(index) ? 'aspect-[3/2] lg:aspect-[2.4/1]' : 'aspect-[3/2]'
                  }`}
                >
                  <Photo
                    src={category.image}
                    alt={category.imageAlt}
                    sizes={
                      isWide(index)
                        ? '(min-width: 1280px) 780px, (min-width: 1024px) 62vw, (min-width: 640px) 48vw, 100vw'
                        : '(min-width: 1280px) 380px, (min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw'
                    }
                    className="photo card-media h-full w-full object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-bg/5"
                    aria-hidden="true"
                  />
                  {/* Deepens on hover so the title gains contrast as the image pushes in. */}
                  <div
                    className="card-scrim absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent"
                    aria-hidden="true"
                  />
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="card-title display text-2xl text-ink">{category.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{category.tagline}</p>
                  <p className="card-cta mt-5 text-[0.6875rem] tracking-label uppercase text-faint">
                    Brief the desk
                    <span className="card-arrow" aria-hidden="true">
                      &rarr;
                    </span>
                  </p>
                </div>
              </Link>
            </Tilt>
          ))}
        </Stagger>
      </div>
    </Section>
  )
}

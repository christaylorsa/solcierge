import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Reveal } from '@/components/motion/Reveal'
import { RequestForm } from '@/components/request/RequestForm'
import { CATEGORIES, CATEGORY_BY_SLUG } from '@/lib/categories'
import { isCategorySlug } from '@/lib/types'

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category: slug } = await params
  if (!isCategorySlug(slug)) return { title: 'Request' }
  const category = CATEGORY_BY_SLUG[slug]
  return { title: category.name, description: category.intro }
}

export default async function CategoryRequestPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category: slug } = await params
  if (!isCategorySlug(slug)) notFound()
  const category = CATEGORY_BY_SLUG[slug]

  return (
    <>
      {/* Banner. One move: the copy fades up over a still image. */}
      <div className="relative isolate overflow-hidden border-b border-line">
        <img
          src={category.image}
          alt={category.imageAlt}
          width={1600}
          height={1067}
          fetchPriority="high"
          className="photo absolute inset-0 h-full w-full object-cover opacity-40"
        />
        {/* Same two-scrim treatment as the hero, so copy never sits on a bright hull. */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-bg via-bg/90 to-bg/80 md:via-bg/85 md:to-bg/30"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/60 via-transparent to-bg" aria-hidden="true" />

        <div className="relative mx-auto max-w-shell px-[var(--shell-x)] py-20 sm:py-28">
          <Reveal>
            <nav className="flex items-center gap-2 text-xs text-faint" aria-label="Breadcrumb">
              <Link href="/request" className="transition-colors duration-300 ease hover:text-accent-soft">
                Request
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-muted">{category.name}</span>
            </nav>

            <h1 className="display mt-6 text-[clamp(2.5rem,7vw,4.5rem)] text-ink">{category.name}</h1>
            <p className="lede mt-6 max-w-2xl">{category.intro}</p>
          </Reveal>
        </div>
      </div>

      <div className="mx-auto max-w-shell px-[var(--shell-x)] py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
          <div>
            <h2 className="eyebrow mb-6">The brief</h2>
            <RequestForm category={category} />
          </div>

          <aside className="space-y-10 lg:pt-11">
            <div className="border border-line bg-surface p-6">
              <p className="eyebrow">What we always ask</p>
              <ul className="mt-5 space-y-3.5">
                {category.asks.map((ask) => (
                  <li key={ask} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <span className="mt-[0.45rem] block h-1 w-1 shrink-0 bg-accent" aria-hidden="true" />
                    {ask}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6 text-sm leading-relaxed">
              <div>
                <p className="eyebrow">Timing</p>
                <p className="mt-2.5 text-muted">{category.leadTime}</p>
              </div>
              <div>
                <p className="eyebrow">Typical spend</p>
                <p className="mt-2.5 text-muted">{category.typical}</p>
              </div>
              <div>
                <p className="eyebrow">Settlement</p>
                <p className="mt-2.5 text-muted">
                  Quoted in USD. Pay in USDC one for one, or in SOL at a rate locked for ten
                  minutes with the countdown on screen.
                </p>
              </div>
            </div>

            <div className="border-t border-line pt-7">
              <p className="text-xs leading-relaxed text-faint">
                Not the right category? {' '}
                <Link href="/request/bespoke" className="link-underline">
                  Send it as Bespoke
                </Link>{' '}
                and the same desk will read it.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

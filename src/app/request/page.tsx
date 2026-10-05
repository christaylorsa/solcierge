import type { Metadata } from 'next'
import Link from 'next/link'
import { Stagger } from '@/components/motion/Reveal'
import { Section, SectionHead } from '@/components/site/Section'
import { CATEGORIES } from '@/lib/categories'

export const metadata: Metadata = {
  title: 'Make a request',
  description:
    'Pick a category and brief a Solcierge concierge. Quotes come back in USD, settled in SOL or USDC.',
}

export default function RequestIndexPage() {
  return (
    <Section>
      <SectionHead
        eyebrow="Make a request"
        title="Where shall we start"
        lede="Pick the closest category. If nothing fits, take Bespoke: it goes to the same desk and gets read the same way."
      />

      <Stagger className="mt-16 divide-y divide-line border-y border-line">
        {CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/request/${category.slug}`}
            className="group grid items-center gap-4 py-8 transition-colors duration-500 ease hover:bg-surface md:grid-cols-[1fr_1.6fr_auto] md:gap-10 md:px-4"
          >
            <div>
              <h2 className="display text-2xl text-ink md:text-3xl">{category.name}</h2>
              <p className="mt-1.5 text-xs text-faint">{category.typical}</p>
            </div>
            <p className="text-sm leading-relaxed text-muted">{category.tagline}</p>
            <span className="text-[0.6875rem] tracking-label uppercase text-faint transition-colors duration-500 ease group-hover:text-accent">
              Brief the desk
            </span>
          </Link>
        ))}
      </Stagger>
    </Section>
  )
}

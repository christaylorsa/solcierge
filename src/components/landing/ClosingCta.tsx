import Link from 'next/link'
import { Eyebrow, MaskedHeading } from '@/components/motion/MaskedHeading'
import { Magnetic } from '@/components/motion/Magnetic'
import { Aurora } from '@/components/motion/Aurora'
import { Section } from '@/components/site/Section'
import { CATEGORIES } from '@/lib/categories'

/** One idea: the cards lift under a precise pointer. No entrance animation competing with it. */
export function ClosingCta() {
  return (
    <Section tone="surface" className="relative overflow-hidden">
      <Aurora />
      <div className="relative mx-auto max-w-2xl text-center">
        <Eyebrow className="justify-center">Start here</Eyebrow>
        <MaskedHeading
          lines={['Tell us what you want']}
          className="display mt-5 text-[clamp(2.25rem,6vw,4rem)] text-ink"
        />
        <p className="lede mt-6">
          Connect a wallet and brief the desk in about two minutes. No fee to ask, no
          obligation to accept the quote, and no supplier contacts you before you book.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Magnetic>
            <Link href="/request" className="btn btn-primary">
              Make a request
            </Link>
          </Magnetic>
          <Link href="/request/bespoke" className="btn btn-ghost">
            Something unusual
          </Link>
        </div>
      </div>

      <div className="relative mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.slice(0, 4).map((category) => (
          <Link
            key={category.slug}
            href={`/request/${category.slug}`}
            className="lift border border-line bg-bg p-6"
          >
            <p className="display text-xl text-ink">{category.name}</p>
            <p className="mt-2 text-xs leading-relaxed text-faint">{category.typical}</p>
          </Link>
        ))}
      </div>
    </Section>
  )
}

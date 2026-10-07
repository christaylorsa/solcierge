import type { Metadata } from 'next'
import Link from 'next/link'
import { ExperienceBrowser } from '@/components/experiences/ExperienceBrowser'
import { Section, SectionHead } from '@/components/site/Section'

export const metadata: Metadata = {
  title: 'Experiences',
  description:
    'Whole journeys planned end to end by the Solcierge desk: safari, Cape Town, the Great Migration, gorillas in Rwanda, the Namib dunes, Bali, the Maldives, the Swiss Alps and the Arctic. Price on request, settled in SOL or USDC.',
}

const HOW = [
  {
    title: 'Pick the shape',
    body: 'Each experience is a starting point, not a package. Choose the one closest to what you want.',
  },
  {
    title: 'We build it around you',
    body: 'The desk plans every part: flights, transfers, stays, meals, guides and the days in between. You get an outline, then a quote.',
  },
  {
    title: 'One settlement',
    body: 'One figure in USD, settled in SOL or USDC. Every part is booked with, and supplied by, the operator named in your quote.',
  },
]

export default function ExperiencesPage() {
  return (
    <>
      <Section>
        <SectionHead
          eyebrow="Solcierge Experiences"
          title="Whole journeys, end to end"
          lede="Pick a place and a feeling. We plan everything in between, and settle it all in one payment. Price on request, because no two are the same."
        />

        <ExperienceBrowser />
      </Section>

      <Section tone="surface" className="border-y border-line">
        <div className="grid gap-10 md:grid-cols-3 md:gap-12">
          {HOW.map((step, index) => (
            <div key={step.title}>
              <p className="ghost-numeral !text-[3.5rem]" aria-hidden="true">
                0{index + 1}
              </p>
              <h2 className="display mt-2 text-2xl text-ink">{step.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 border-t border-line pt-8 text-xs leading-relaxed text-faint">
          Somewhere else in mind?{' '}
          <Link href="/request/bespoke" className="link-underline">
            Brief it as Bespoke
          </Link>{' '}
          and the same desk will plan it.
        </p>
      </Section>
    </>
  )
}

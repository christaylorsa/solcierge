import Link from 'next/link'
import { Eyebrow, MaskedHeading } from '@/components/motion/MaskedHeading'
import { Reveal } from '@/components/motion/Reveal'
import { ExperienceGrid } from '@/components/experiences/ExperienceGrid'
import { Section } from '@/components/site/Section'
import { EXPERIENCES, FEATURED_EXPERIENCES } from '@/lib/experiences'

/** Whole journeys, after the single-service tiles: the same desk, planning everything. */
export function Experiences() {
  return (
    <Section id="experiences" className="border-b border-line">
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div className="max-w-2xl">
          <Eyebrow>Solcierge Experiences</Eyebrow>
          <MaskedHeading
            lines={['Whole journeys,', <span key="i" className="italic text-muted">planned end to end</span>]}
            className="display mt-5 text-[clamp(2.25rem,5vw,3.5rem)] text-ink"
          />
          <Reveal delayIndex={2}>
            <p className="lede mt-6">
              Pick a place and a feeling. We plan everything in between: the flights, the transfers,
              where you sleep, what you eat, who guides you, and the days left deliberately empty.
            </p>
          </Reveal>
        </div>
        <Reveal delayIndex={3}>
          <Link href="/experiences" className="link-underline text-sm text-muted">
            All {EXPERIENCES.length} experiences
          </Link>
        </Reveal>
      </div>

      <ExperienceGrid experiences={FEATURED_EXPERIENCES} className="mt-16" />

      <p className="mt-10 text-xs leading-relaxed text-faint">
        Price on request. Every experience is built around your dates, your group and your taste.{' '}
        <Link href="/experiences" className="link-underline text-muted">
          See all {EXPERIENCES.length}, across Africa, Europe and the UK, Asia and the Americas
        </Link>
        .
      </p>
    </Section>
  )
}

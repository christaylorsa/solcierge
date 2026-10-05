import { Crossfade } from '@/components/motion/Crossfade'
import { CountUp } from '@/components/motion/Odometer'
import { Eyebrow, MaskedHeading } from '@/components/motion/MaskedHeading'
import { Section } from '@/components/site/Section'

const RECENT = [
  {
    when: 'February',
    what: 'Teterboro to Aspen, Challenger 350',
    detail:
      'Four passengers, skis, one crate-trained dog in cabin. Slot times at Aspen are unforgiving, so we built in a two-hour buffer and it was needed.',
    settled: { amount: 389.33, decimals: 2, unit: 'SOL' },
  },
  {
    when: 'August',
    what: 'Seven nights, Positano to Capri',
    detail:
      '38 metre Sanlorenzo, eight guests in four cabins, chef aboard. Provisioning billed at cost after the charter rather than guessed at up front.',
    settled: { amount: 214500, decimals: 0, unit: 'USDC' },
  },
  {
    when: 'September',
    what: 'Monaco, historic Grand Prix weekend',
    detail:
      'A 992 GT3 in manual, delivered to the hotel at nine on the Thursday. Insurance and the cross-border paperwork were done before the keys moved.',
    settled: { amount: 11800, decimals: 0, unit: 'USDC' },
  },
]

const FRAMES = [
  { src: '/media/hero-1.jpg', alt: 'A private jet on the apron at dusk' },
  { src: '/media/hero-2.jpg', alt: 'A superyacht moored in a harbour at golden hour' },
  { src: '/media/hero-3.jpg', alt: 'A lit villa and pool at night' },
]

/** One idea: the frames dissolve into one another. Nothing else in this band moves. */
export function Commissions() {
  return (
    <Section id="commissions">
      <div className="max-w-2xl">
        <Eyebrow>Recently</Eyebrow>
        <MaskedHeading
          lines={['Three we can talk about']}
          className="display mt-5 text-[clamp(2.25rem,5vw,3.5rem)] text-ink"
        />
        <p className="lede mt-6">
          Most of what we arrange stays private. These three are here with the members&apos;
          blessing, settlement figures included.
        </p>
      </div>

      <div className="mt-16 grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-20">
        <Crossfade
          images={FRAMES}
          width={1920}
          height={1200}
          interval={5400}
          className="aspect-[8/5] border border-line"
          imageClassName="photo"
        />

        <ul className="divide-y divide-line">
          {RECENT.map((item) => (
            <li key={item.what} className="py-7 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="eyebrow">{item.when}</p>
                <p className="font-mono text-xs text-accent-soft">
                  <CountUp
                    value={item.settled.amount}
                    decimals={item.settled.decimals}
                    suffix={` ${item.settled.unit}`}
                  />
                </p>
              </div>
              <h3 className="display mt-3 text-2xl text-ink">{item.what}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

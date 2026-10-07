import { FilmGrain } from '@/components/motion/FilmGrain'
import { Eyebrow, MaskedHeading } from '@/components/motion/MaskedHeading'
import { ParallaxPhoto } from '@/components/motion/ParallaxPhoto'
import { Reveal } from '@/components/motion/Reveal'
import { TIERS, type Tier } from '@/lib/tiers'

/**
 * What the upper tiers get, deliberately unsaid, set against a candlelit table. The
 * privileges are decided by the desk, case by case, so nothing here is a promise that
 * could be held to a list.
 */
export function Privileges({ tier }: { tier: Tier }) {
  const reached = TIERS.indexOf(tier)
  const sealed = [
    { label: TIERS[1].name, open: reached >= 1, note: 'Opens with the tier.' },
    { label: TIERS[2].name, open: reached >= 2, note: 'Opens with the tier.' },
    { label: 'By invitation', open: false, note: 'Some are never announced.' },
  ]

  return (
    <section className="relative isolate overflow-hidden border-y border-line">
      <ParallaxPhoto src="/media/dining.jpg" position="50% 45%" className="opacity-50" travel={14} />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/35" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-bg via-transparent to-bg" />
      <FilmGrain />

      <div className="relative mx-auto grid max-w-shell gap-14 px-[var(--shell-x)] py-28 sm:py-36 lg:grid-cols-[1fr_1.3fr] lg:items-center lg:gap-16">
        <div>
          <Eyebrow>Privileges</Eyebrow>
          <MaskedHeading
            lines={['Some things are', <span key="i" className="italic text-muted">not on the menu</span>]}
            className="display mt-5 text-[clamp(2.5rem,5vw,4rem)] text-ink"
          />
          <Reveal delayIndex={2}>
            <p className="lede mt-7 max-w-md">
              The members who book with us most are looked after in ways we do not publish. There is nothing to
              claim and nothing to redeem. Reach a tier and the desk will be in touch.
            </p>
            <p className="mt-6 max-w-md text-xs leading-relaxed text-faint">
              Privileges are at the desk&apos;s discretion, subject to availability, and may change.
            </p>
          </Reveal>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {sealed.map((item, index) => (
            <Reveal key={item.label} delayIndex={index + 2}>
              <div
                className={`flex h-full flex-col items-center border px-5 py-10 text-center backdrop-blur-md transition-colors duration-700 ease ${
                  item.open ? 'border-accent/55 bg-raised/70' : 'border-accent/15 bg-bg/45 hover:border-accent/35'
                }`}
              >
                <Seal open={item.open} />
                <p className="mt-7 text-[0.6875rem] tracking-label uppercase text-muted">{item.label}</p>
                <p className={`display mt-2 text-3xl italic ${item.open ? 'text-accent-soft' : 'text-ink'}`}>
                  {item.open ? 'Opened' : 'Sealed'}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-faint">
                  {item.open ? 'Yours. The desk will be in touch.' : item.note}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/** A wax-seal monogram in hairline gold. The dashed ring turns, very slowly. */
function Seal({ open }: { open: boolean }) {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={open ? 'text-accent' : 'text-accent/50'}
    >
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="0.8" />
      <circle className="seal-turn" cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1.5 3" />
      {open ? <circle cx="32" cy="32" r="20" fill="currentColor" fillOpacity="0.12" /> : null}
      <text
        x="32"
        y="40"
        textAnchor="middle"
        fill="currentColor"
        style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 300 }}
      >
        S
      </text>
    </svg>
  )
}

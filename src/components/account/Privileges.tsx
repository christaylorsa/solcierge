import { Reveal } from '@/components/motion/Reveal'
import { TIERS, type Tier } from '@/lib/tiers'

/**
 * What the upper tiers get, deliberately unsaid. The privileges are decided by the
 * desk, case by case, so nothing here is a promise that could be held to a list.
 */
export function Privileges({ tier }: { tier: Tier }) {
  const reached = TIERS.indexOf(tier)
  const sealed = [
    { label: TIERS[1].name, open: reached >= 1, note: 'Opens with the tier.' },
    { label: TIERS[2].name, open: reached >= 2, note: 'Opens with the tier.' },
    { label: 'By invitation', open: false, note: 'Some are never announced.' },
  ]

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
      <div>
        <p className="eyebrow">Privileges</p>
        <h2 className="display mt-4 text-[clamp(2rem,4vw,3rem)] text-ink">Some things are not on the menu</h2>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
          The members who book with us most are looked after in ways we do not publish. There is nothing to
          claim and nothing to redeem. Reach a tier and the desk will be in touch.
        </p>
        <p className="mt-6 max-w-md text-xs leading-relaxed text-faint">
          Privileges are at the desk&apos;s discretion, subject to availability, and may change.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {sealed.map((item, index) => (
          <Reveal key={item.label} delayIndex={index}>
            <div
              className={`flex h-full flex-col items-center border px-5 py-8 text-center ${
                item.open ? 'border-accent/50 bg-raised' : 'border-line bg-surface'
              }`}
            >
              <Seal open={item.open} />
              <p className="mt-6 text-[0.6875rem] tracking-label uppercase text-muted">{item.label}</p>
              <p className={`display mt-2 text-2xl italic ${item.open ? 'text-accent-soft' : 'text-ink'}`}>
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
  )
}

/** A wax-seal monogram in hairline gold. */
function Seal({ open }: { open: boolean }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true" className={open ? 'text-accent' : 'text-accent/45'}>
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1.5 3" />
      {open ? <circle cx="32" cy="32" r="20" fill="currentColor" fillOpacity="0.1" /> : null}
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

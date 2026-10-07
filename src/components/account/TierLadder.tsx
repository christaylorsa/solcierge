import { MembershipCard } from './MembershipCard'
import { Eyebrow, MaskedHeading } from '@/components/motion/MaskedHeading'
import { Reveal } from '@/components/motion/Reveal'
import { usd } from '@/lib/format'
import { TIERS, type Standing, type Tier } from '@/lib/tiers'

/**
 * The three tiers side by side, each shown as the card it gives you, with its
 * threshold and what is left to reach it. No progress bars, on purpose: a bar turns
 * a membership into a loyalty scheme. Tiers not yet reached show their card dimmed,
 * so the next one is something to look at, not a number to chase.
 */
export function TierLadder({ standing }: { standing: Standing }) {
  const currentIndex = TIERS.indexOf(standing.tier)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div className="max-w-xl">
          <Eyebrow>Membership</Eyebrow>
          <MaskedHeading
            lines={['Three cards,', <span key="i" className="italic text-muted">earned on what you book</span>]}
            className="display mt-5 text-[clamp(2.25rem,4.5vw,3.5rem)] text-ink"
          />
        </div>
        <Reveal>
          <p className="max-w-sm text-sm leading-relaxed text-muted">{summary(standing)}</p>
        </Reveal>
      </div>

      <ol className="mt-14 grid divide-y divide-line border border-line md:grid-cols-3 md:divide-x md:divide-y-0">
        {TIERS.map((tier, index) => (
          <Reveal as="li" key={tier.key} delayIndex={index} className="flex">
            <TierColumn tier={tier} state={stateOf(index, currentIndex)} spend={standing.spend} />
          </Reveal>
        ))}
      </ol>

      <p className="mt-5 text-xs leading-relaxed text-faint">
        Counts every booking you have settled with us, at the USD quote. Cancelled and refunded bookings do not count.
      </p>
    </div>
  )
}

type State = 'reached' | 'current' | 'ahead'

function stateOf(index: number, current: number): State {
  if (index < current) return 'reached'
  if (index === current) return 'current'
  return 'ahead'
}

function TierColumn({ tier, state, spend }: { tier: Tier; state: State; spend: number }) {
  const current = state === 'current'
  const remaining = Math.max(0, tier.from - spend)

  return (
    <div className={`relative flex w-full flex-col p-7 sm:p-9 ${current ? 'bg-raised' : 'bg-bg'}`}>
      {current ? <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-accent" /> : null}

      <div className="flex items-center justify-between gap-4">
        <span className="text-[0.625rem] tracking-label uppercase text-faint">Tier {tier.numeral}</span>
        <StateLabel state={state} />
      </div>

      <div className="relative mx-auto mt-9 w-full max-w-[300px]">
        {current && tier.key !== 'member' ? <div className="mcard-glow" aria-hidden="true" /> : null}
        <MembershipCard tier={tier} locked={state === 'ahead'} />
      </div>

      <p className={`display mt-11 text-4xl ${state === 'ahead' ? 'text-muted' : 'text-ink'}`}>{tier.name}</p>
      <p className="mt-2 text-sm leading-relaxed text-faint">{tier.line}</p>

      <div className="mt-auto pt-10">
        <div className="border-t border-line pt-6">
          <p className="text-[0.625rem] tracking-label uppercase text-faint">Opens at</p>
          <p className="display mt-2 text-3xl text-ink lining-nums">
            {tier.from === 0 ? 'Your first request' : usd(tier.from)}
          </p>
          <p className={`mt-3 text-sm ${state === 'ahead' ? 'text-accent-soft' : 'text-faint'}`}>
            {state === 'ahead' ? `${usd(remaining)} to go` : state === 'current' ? 'Where you are now' : 'Reached'}
          </p>
        </div>
      </div>
    </div>
  )
}

function StateLabel({ state }: { state: State }) {
  if (state === 'current') {
    return (
      <span className="inline-flex items-center gap-2 border border-accent/50 px-2.5 py-1 text-[0.625rem] tracking-label uppercase text-accent-soft">
        <span className="block h-1 w-1 rounded-full bg-current" aria-hidden="true" />
        Your tier
      </span>
    )
  }
  if (state === 'reached') {
    return <span className="text-[0.625rem] tracking-label uppercase text-faint">Reached</span>
  }
  return (
    <span className="inline-flex items-center gap-2 text-[0.625rem] tracking-label uppercase text-faint">
      <svg width="11" height="13" viewBox="0 0 14 16" fill="none" aria-hidden="true">
        <rect x="1.5" y="7" width="11" height="8" rx="1" stroke="currentColor" />
        <path d="M4 7V4.5a3 3 0 0 1 6 0V7" stroke="currentColor" />
      </svg>
      Locked
    </span>
  )
}

function summary(standing: Standing): string {
  if (!standing.next) return 'You are among the members we value most. Thank you for trusting us with so much.'
  if (standing.spend === 0) {
    return `Tiers open as you settle bookings. ${usd(standing.next.from)} settled opens ${standing.next.name}.`
  }
  return `You have settled ${usd(standing.spend)} with us. Another ${usd(standing.toNext ?? 0)} opens ${standing.next.name}.`
}

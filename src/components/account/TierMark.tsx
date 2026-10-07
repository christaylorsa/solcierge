import type { Tier } from '@/lib/tiers'

/** A small engraved-looking tier label: numeral, hairline, name. */
export function TierMark({ tier, className = '' }: { tier: Tier; className?: string }) {
  const top = tier.key === 'black'
  return (
    <span
      className={`inline-flex items-center gap-3 border px-3.5 py-2 text-[0.6875rem] tracking-label uppercase ${
        top ? 'border-accent bg-accent/[0.08] text-accent-soft' : 'border-accent/45 text-accent-soft'
      } ${className}`}
    >
      <span className="display text-base normal-case tracking-normal text-accent">{tier.numeral}</span>
      <span className="h-3 w-px bg-accent/40" aria-hidden="true" />
      {tier.name}
    </span>
  )
}

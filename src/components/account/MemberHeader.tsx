import { MemberAvatar } from './MemberAvatar'
import { TierMark } from './TierMark'
import { usd } from '@/lib/format'
import type { XLink } from '@/lib/data'
import type { Standing } from '@/lib/tiers'

const SINCE = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })

/** The top of the profile, set like a membership card. */
export function MemberHeader({
  name,
  x,
  memberSince,
  standing,
}: {
  name: string | null
  x: XLink | null
  memberSince: string | null
  standing: Standing
}) {
  const since = memberSince ? SINCE.format(new Date(memberSince)) : null
  const title = name || (x ? (x.name ?? `@${x.username}`) : 'Your profile')

  return (
    <div className="relative overflow-hidden border border-line bg-surface">
      {/* Warm light from the top right. The grain over it keeps the falloff from banding. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 140% at 100% 0%, rgb(var(--accent) / 0.13), rgb(var(--accent) / 0.04) 45%, transparent 70%)',
        }}
      />
      <div aria-hidden="true" className="film-grain" />

      <div className="relative grid gap-8 p-7 sm:p-10 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-10">
        <MemberAvatar src={x?.avatar_url ?? null} name={title} size={112} />

        <div className="min-w-0">
          <p className="eyebrow">{since ? `Member since ${since}` : 'Member'}</p>
          <h1 className="display mt-3 break-words text-[clamp(2.25rem,5vw,3.75rem)] text-ink">{title}</h1>
          {x ? (
            <a
              href={`https://x.com/${x.username}`}
              target="_blank"
              rel="noreferrer noopener"
              className="link-underline mt-3 inline-block text-sm"
            >
              @{x.username}
            </a>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-4 border-t border-line pt-6 md:items-end md:border-l md:border-t-0 md:pl-10 md:pt-0">
          <TierMark tier={standing.tier} />
          <div className="md:text-right">
            <p className="display text-4xl text-ink lining-nums">{usd(standing.spend)}</p>
            <p className="mt-1 text-xs text-faint">Settled with us, lifetime</p>
          </div>
        </div>
      </div>
    </div>
  )
}

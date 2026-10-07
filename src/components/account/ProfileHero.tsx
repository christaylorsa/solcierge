import Link from 'next/link'
import { MemberAvatar } from './MemberAvatar'
import { MembershipCard } from './MembershipCard'
import { TierMark } from './TierMark'
import { FilmGrain } from '@/components/motion/FilmGrain'
import { HeroGlow } from '@/components/motion/HeroGlow'
import { CountUp } from '@/components/motion/Odometer'
import { ParallaxPhoto } from '@/components/motion/ParallaxPhoto'
import { Reveal } from '@/components/motion/Reveal'
import type { XLink } from '@/lib/data'
import type { Standing } from '@/lib/tiers'

const SINCE = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })

/**
 * The top of the profile: a dusk runway behind, the member's card in front of it.
 * Left column greets them and states where they stand; right column is the card.
 */
export function ProfileHero({
  name,
  x,
  memberSince,
  standing,
  introduced,
}: {
  name: string | null
  x: XLink | null
  memberSince: string | null
  standing: Standing
  introduced: number
}) {
  const since = memberSince ? SINCE.format(new Date(memberSince)) : null
  const display = name || x?.name || null
  const first = display ? display.split(' ')[0] : null

  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <ParallaxPhoto src="/media/hero-1.jpg" position="72% 62%" className="opacity-45" />
      {/* Dark column for the type on the left, the frame tied into the page below. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-bg via-bg/90 to-bg/80 lg:via-bg/85 lg:to-bg/25"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-bg/75 via-transparent to-bg" />
      <HeroGlow />
      <FilmGrain />

      <div className="relative mx-auto grid max-w-shell items-center gap-16 px-[var(--shell-x)] pb-24 pt-10 sm:pb-28 lg:min-h-[80dvh] lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:pb-24 lg:pt-12">
        <div>
          <nav className="flex items-center gap-2 text-xs text-faint" aria-label="Breadcrumb">
            <Link href="/account" className="transition-colors duration-300 ease hover:text-accent-soft">
              My bookings
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-muted">Profile</span>
          </nav>

          <Reveal>
            <p className="eyebrow mt-14 lg:mt-20">{since ? `Member since ${since}` : 'Your membership'}</p>
          </Reveal>

          <h1 className="mask-reveal in-view mt-6 text-[clamp(2.75rem,7vw,5.25rem)]">
            <span className="mask-line">
              <span className="display block text-ink" style={{ ['--i' as string]: 1 }}>
                {first ? 'Welcome back,' : 'Your'}
              </span>
            </span>
            <span className="mask-line">
              <span className="display block break-words italic text-accent" style={{ ['--i' as string]: 2 }}>
                {first ?? 'membership'}
              </span>
            </span>
          </h1>

          {x ? (
            <Reveal delayIndex={4}>
              <a
                href={`https://x.com/${x.username}`}
                target="_blank"
                rel="noreferrer noopener"
                className="group mt-7 inline-flex items-center gap-3"
              >
                <MemberAvatar src={x.avatar_url} name={x.name ?? x.username} size={36} />
                <span className="text-sm text-muted transition-colors duration-300 ease group-hover:text-accent-soft">
                  @{x.username}
                </span>
              </a>
            </Reveal>
          ) : null}

          <Reveal delayIndex={5}>
            <dl className="mt-14 flex max-w-xl flex-wrap gap-x-12 gap-y-8 border-t border-line pt-8">
              <div>
                <dt className="text-[0.625rem] tracking-label uppercase text-faint">Settled, lifetime</dt>
                <dd className="display mt-3 whitespace-nowrap text-[clamp(1.5rem,3vw,2.25rem)] text-ink lining-nums">
                  $<CountUp value={Math.round(standing.spend)} />
                </dd>
              </div>
              <div>
                <dt className="text-[0.625rem] tracking-label uppercase text-faint">Tier</dt>
                <dd className="mt-3">
                  <TierMark tier={standing.tier} />
                </dd>
              </div>
              <div>
                <dt className="text-[0.625rem] tracking-label uppercase text-faint">Introduced</dt>
                <dd className="display mt-3 text-[clamp(1.5rem,3vw,2.25rem)] text-ink lining-nums">
                  <CountUp value={introduced} />
                </dd>
              </div>
            </dl>
          </Reveal>
        </div>

        <Reveal delayIndex={3} className="relative mx-auto w-full max-w-[460px]">
          {standing.tier.key !== 'member' ? <div className="mcard-glow" aria-hidden="true" /> : null}
          <MembershipCard tier={standing.tier} name={display} memberSince={memberSince} float />
          <p className="mt-10 text-center text-[0.625rem] tracking-label uppercase text-faint">
            {standing.next
              ? `${standing.tier.name} · ${standing.next.name} opens at $${standing.next.from.toLocaleString('en-US')}`
              : `${standing.tier.name} · Our highest tier`}
          </p>
        </Reveal>
      </div>
    </section>
  )
}

'use client'

import { useRef } from 'react'
import { m, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'
import { FOLLOW_SPRING } from '@/lib/motion'
import type { Tier } from '@/lib/tiers'

const SINCE = new Intl.DateTimeFormat('en-GB', { month: '2-digit', year: '2-digit' })

/**
 * The membership card as an object you can turn in the light.
 *
 * Under a precise pointer it tilts toward the cursor (capped at 7 degrees, heavily
 * damped) and a soft highlight follows the pointer across the metal. On touch or with
 * reduced motion it is a still card, lit from the top left. The name is only ever the
 * member's own, on their own profile: the public share card never carries it.
 */
export function MembershipCard({
  tier,
  name,
  memberSince,
  float = false,
  locked = false,
  className = '',
}: {
  tier: Tier
  /** Engraved along the bottom. Omitted on the tier previews. */
  name?: string | null
  memberSince?: string | null
  float?: boolean
  locked?: boolean
  className?: string
}) {
  const { pointerMotion } = useMotionAllowed()
  const ref = useRef<HTMLDivElement | null>(null)

  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const hx = useMotionValue(28)
  const hy = useMotionValue(18)
  const rotateX = useSpring(rx, FOLLOW_SPRING)
  const rotateY = useSpring(ry, FOLLOW_SPRING)
  const lightX = useSpring(hx, FOLLOW_SPRING)
  const lightY = useSpring(hy, FOLLOW_SPRING)
  const sheen = useMotionTemplate`radial-gradient(circle at ${lightX}% ${lightY}%, rgb(255 255 255 / 0.3), transparent 48%)`

  const onMove = (event: React.PointerEvent) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    const px = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
    const py = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height))
    rx.set((0.5 - py) * 9)
    ry.set((px - 0.5) * 14)
    hx.set(px * 100)
    hy.set(py * 100)
  }

  const reset = () => {
    rx.set(0)
    ry.set(0)
    hx.set(28)
    hy.set(18)
  }

  const since = memberSince ? SINCE.format(new Date(memberSince)) : null
  const engraved = (name ?? '').trim().toUpperCase().slice(0, 26)

  return (
    <div
      ref={ref}
      onPointerMove={pointerMotion ? onMove : undefined}
      onPointerLeave={pointerMotion ? reset : undefined}
      className={`mcard ${locked ? 'mcard--locked' : ''} ${float ? 'mcard-float' : ''} ${className}`}
      style={{ perspective: 1400 }}
      role="img"
      aria-label={`${tier.name} membership card${locked ? ', not yet reached' : ''}`}
    >
      <m.div
        className="mcard-body"
        style={pointerMotion ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
      >
        <div className={`mcard-face mcard-face--${tier.key}`}>
          <div className="film-grain" aria-hidden="true" />

          <div className="relative flex items-start justify-between">
            <span className="mcard-ink display leading-none" style={{ fontSize: '7.4cqw' }}>
              Solcierge
            </span>
            <span className="mcard-ink display leading-none" style={{ fontSize: '8.4cqw' }}>
              {tier.numeral}
            </span>
          </div>

          <Seal />

          <div className="relative flex items-end justify-between gap-[4cqw]">
            <div className="min-w-0">
              {engraved ? (
                <p className="mcard-ink truncate font-medium" style={{ fontSize: '3.7cqw', letterSpacing: '0.16em' }}>
                  {engraved}
                </p>
              ) : null}
              <p
                className="mcard-ink opacity-75"
                style={{ fontSize: '2.5cqw', letterSpacing: '0.22em', marginTop: engraved ? '1.4cqw' : 0 }}
              >
                {since ? `MEMBER SINCE ${since}` : 'MEMBERSHIP'}
              </p>
            </div>
            <span className="mcard-ink shrink-0 font-medium" style={{ fontSize: '3.2cqw', letterSpacing: '0.3em' }}>
              {tier.name.toUpperCase()}
            </span>
          </div>

          <m.div className="mcard-sheen" style={pointerMotion ? { background: sheen } : undefined} aria-hidden="true" />
          <div className="mcard-sweep" aria-hidden="true" />
        </div>
      </m.div>
    </div>
  )
}

/** An engraved monogram where a chip would sit. */
function Seal() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="mcard-ink relative"
      style={{ width: '13cqw', height: '13cqw', color: 'var(--mcard-ink)', opacity: 0.85 }}
    >
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1" />
      <circle cx="32" cy="32" r="24.5" stroke="currentColor" strokeWidth="0.7" strokeDasharray="1.4 2.6" />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fill="currentColor"
        style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 300 }}
      >
        S
      </text>
    </svg>
  )
}

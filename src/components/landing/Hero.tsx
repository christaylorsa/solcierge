'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { HeroGlow } from '@/components/motion/HeroGlow'
import { HeroVideo } from '@/components/motion/HeroVideo'
import { FilmGrain } from '@/components/motion/FilmGrain'
import { Magnetic } from '@/components/motion/Magnetic'
import { RotatingWord } from '@/components/motion/RotatingWord'
import { Reveal } from '@/components/motion/Reveal'

const STATS: [string, string][] = [
  ['90 min', 'Median time to first quote'],
  ['SOL / USDC', 'Settlement assets'],
  ['10 min', 'Rate lock on every quote'],
  ['On chain', 'Every payment verified'],
]

/**
 * The hero, composed of four quiet moves that do not compete:
 *
 *   1. Scroll parallax. The photograph sinks 12% of the viewport and scales from 1.06
 *      to 1.12 across the first screen, while the copy lifts slightly faster. The
 *      differential is the whole effect: the plane appears to settle as you leave it.
 *      Nothing here is fast enough to notice directly, which is the intent.
 *   2. Film grain and vignette, so the frame reads as photographed rather than placed.
 *   3. A masked, per-line entrance on load with the rotating word.
 *   4. The cursor glow, which was already here.
 *
 * All four are transform and opacity only. The image starts pre-scaled at 1.06 so the
 * parallax never exposes an edge as it drifts.
 */
export function Hero() {
  const hostRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: hostRef,
    // From the hero's top hitting the viewport top, to its bottom leaving it.
    offset: ['start start', 'end start'],
  })

  // The image sinks and grows; the copy rises past it and fades out as it goes.
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '12%'])
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.06, 1.12])
  const glowShift = useTransform(scrollYProgress, [0, 1], ['0%', '-6%'])
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '-14%'])
  const copyOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  const still = { y: undefined, scale: undefined, opacity: undefined }

  return (
    <div ref={hostRef} className="relative isolate overflow-hidden">
      {/* The backplate parallaxes as one layer, whether it resolves to video or a still. */}
      <m.div
        className="absolute inset-0 opacity-70"
        style={reduced ? still : { y: imageY, scale: imageScale }}
        aria-hidden="true"
      >
        <HeroVideo />
      </m.div>

      {/* Two scrims, not one: the horizontal keeps a dark column for the type, the
          vertical ties the frame into the section below it.
          On mobile the copy runs the full width, so the horizontal scrim has to stay
          dark all the way across. It only opens up once there is room beside the text. */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-bg via-bg/92 to-bg/80 md:via-bg/90 md:to-bg/20"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-bg/70 via-transparent to-bg"
        aria-hidden="true"
      />

      {/* The sunset glow drifts against the image, a touch slower than it. */}
      <m.div className="absolute inset-0" style={reduced ? still : { y: glowShift }}>
        <HeroGlow />
      </m.div>

      <FilmGrain />

      <m.div
        style={reduced ? still : { y: copyY, opacity: copyOpacity }}
        className="relative mx-auto flex min-h-[86dvh] max-w-shell flex-col justify-center px-[var(--shell-x)] py-28"
      >
        <Reveal>
          <p className="eyebrow">Members only · Solana native</p>
        </Reveal>

        {/* Masked per-line entrance. The rotating word carries the second line. */}
        <h1 className="mask-reveal in-view mt-7 text-[clamp(2.75rem,9vw,6.5rem)]">
          <span className="mask-line">
            <span className="display block text-ink" style={{ ['--i' as string]: 1 }}>
              Book <RotatingWord />
            </span>
          </span>
          <span className="mask-line">
            <span className="display block italic text-accent" style={{ ['--i' as string]: 2 }}>
              Pay in crypto.
            </span>
          </span>
        </h1>

        <Reveal delayIndex={5}>
          <p className="lede mt-9 max-w-xl">
            Jets, yachts, villas, cars, the table that is fully booked. Tell a concierge what
            you want, take a firm quote in USD, and settle it in SOL or USDC. We source and
            fulfil, so there is nothing to browse and nothing to bid on.
          </p>
        </Reveal>

        <Reveal delayIndex={6}>
          <div className="mt-11 flex flex-wrap items-center gap-4">
            <Magnetic>
              <Link href="/request" className="btn btn-primary">
                Make a request
              </Link>
            </Magnetic>
            <Link href="#how" className="btn btn-ghost">
              How it works
            </Link>
          </div>
        </Reveal>

        <Reveal delayIndex={7}>
          <dl className="mt-20 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-8 border-t border-line pt-9 sm:grid-cols-4">
            {STATS.map(([value, label]) => (
              <div key={label}>
                <dt className="display whitespace-nowrap text-2xl text-accent-soft sm:text-3xl">
                  {value}
                </dt>
                <dd className="mt-2 text-xs leading-relaxed text-faint">{label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </m.div>
    </div>
  )
}

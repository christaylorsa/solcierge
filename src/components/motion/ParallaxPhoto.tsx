'use client'

import { useRef } from 'react'
import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion'

/**
 * A full-bleed photograph that sinks slightly as its section scrolls past, the same
 * move as the landing hero at a smaller scale. Pre-scaled so the drift never shows an
 * edge. Decorative: always aria-hidden, the copy carries the meaning.
 */
export function ParallaxPhoto({
  src,
  className = '',
  position = 'center',
  travel = 10,
}: {
  src: string
  className?: string
  position?: string
  /** How far the photo drifts across the section's pass, in percent. */
  travel?: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [`-${travel / 2}%`, `${travel / 2}%`])

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <m.div className="absolute -inset-[8%]" style={reduced ? undefined : { y }}>
        <img
          src={src}
          alt=""
          className={`photo h-full w-full object-cover ${className}`}
          style={{ objectPosition: position }}
        />
      </m.div>
    </div>
  )
}

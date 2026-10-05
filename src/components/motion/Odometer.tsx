'use client'

import { useEffect, useRef, useState } from 'react'
import {
  animate,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from 'framer-motion'
import { EASE, DUR, VIEWPORT_MARGIN } from '@/lib/motion'

/**
 * A digit column that rolls to its value like a mechanical counter.
 *
 * Each digit is a strip of 0-9 inside a one-character window, translated by
 * -value * 1em. Only the digits that actually changed move, which is why a ticking
 * clock rolls its seconds while the minutes sit still, exactly like a real odometer.
 *
 * The strip is rendered as text rather than drawn, so it inherits the font, stays
 * selectable-adjacent for the accessible label, and costs nothing but a transform.
 */
export function OdometerDigit({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`odometer-window ${className}`} aria-hidden="true">
      <span
        className="odometer-strip"
        // Expressed in cells, not ems, so the travel always matches the mask height.
        style={{ transform: `translateY(calc(${-value} * var(--cell)))` }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <span key={digit}>{digit}</span>
        ))}
      </span>
    </span>
  )
}

/**
 * Renders a string of characters as rolling digits, passing anything non-numeric
 * (colons, decimal points) straight through.
 *
 * The visible digits are aria-hidden and the whole value is exposed once as text to
 * assistive tech, so a screen reader hears "4:38" rather than ten digits per column.
 */
export function Odometer({
  value,
  className = '',
  label,
}: {
  value: string
  className?: string
  label?: string
}) {
  return (
    <span className={`odometer ${className}`}>
      <span className="sr-only">{label ?? value}</span>
      {value.split('').map((char, index) =>
        /\d/.test(char) ? (
          <OdometerDigit key={index} value={Number(char)} />
        ) : (
          <span key={index} className="odometer-sep" aria-hidden="true">
            {char}
          </span>
        ),
      )}
    </span>
  )
}

/**
 * Counts from zero to `value` when scrolled into view, once.
 *
 * Uses the expo curve over 1.6s rather than a linear ramp: a linear count looks like a
 * loading spinner, while a decelerating one looks like a mechanism coming to rest. The
 * final frame is pinned to the exact target so rounding can never leave it a penny short.
 */
export function CountUp({
  value,
  decimals = 0,
  suffix = '',
  className = '',
}: {
  value: number
  decimals?: number
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: VIEWPORT_MARGIN })
  const reduced = useReducedMotion()

  // Seeded with the real figure, not with zero.
  //
  // These are factual claims about money and time. Every failure mode of the animation,
  // no JS, reduced motion, a backgrounded tab that throttles rAF, an interrupted
  // navigation, has to leave the true number on screen. Counting up from zero is an
  // embellishment on top of a correct value, so the value is rendered first and the
  // animation only rewinds it once we know it can actually run.
  const progress = useMotionValue(value)
  const [shown, setShown] = useState(value)

  useMotionValueEvent(progress, 'change', (latest) => setShown(latest))

  useEffect(() => {
    if (!inView || reduced) return
    // A hidden tab gets no animation frames, so an animation started here would strand
    // the display at 0 until the tab is looked at again.
    if (document.hidden) return

    progress.set(0)
    const controls = animate(progress, value, { duration: DUR.drift, ease: EASE.expo })
    return () => {
      controls.stop()
      // Whatever stopped us, the honest number is the one that stays.
      progress.set(value)
    }
  }, [inView, reduced, progress, value])

  const text = shown.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">
        {value.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}
        {suffix}
      </span>
      <span aria-hidden="true" className="tabular-nums">
        {text}
        {suffix}
      </span>
    </span>
  )
}

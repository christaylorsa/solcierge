'use client'

import { useRef, type ReactNode } from 'react'
import { m, useMotionValue, useSpring } from 'framer-motion'
import { FOLLOW_SPRING } from '@/lib/motion'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'

/**
 * Wraps a control so it leans toward the cursor.
 *
 * The lean is capped at 6px and scaled by distance from centre, so the element never
 * detaches from where the eye expects it to be. The point is not that the button moves,
 * it is that the surface feels responsive to being approached.
 *
 * Two things this deliberately does not do:
 *
 *   - It does not move the hit area. The wrapper stays put and only an inner span
 *     transforms, so the click target and the page layout are exactly where they were.
 *     A magnetic button you have to chase is a bug.
 *   - It does not change the rendered element type when motion is unavailable. The
 *     capability hook starts pessimistic and flips after mount, so swapping between a
 *     plain span and a motion span would remount the children and flash the content.
 *     The tree is identical either way; only the handlers and the transform differ.
 */
export function Magnetic({
  children,
  className = '',
  strength = 6,
}: {
  children: ReactNode
  className?: string
  /** Maximum offset in pixels. Above about 8 it starts to feel gimmicky. */
  strength?: number
}) {
  const { pointerMotion } = useMotionAllowed()
  const hostRef = useRef<HTMLSpanElement | null>(null)

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const x = useSpring(rawX, FOLLOW_SPRING)
  const y = useSpring(rawY, FOLLOW_SPRING)

  const onMove = (event: React.PointerEvent) => {
    const box = hostRef.current?.getBoundingClientRect()
    if (!box) return
    // -1..1 from centre, clamped, then damped to `strength` pixels.
    const dx = (event.clientX - (box.left + box.width / 2)) / (box.width / 2)
    const dy = (event.clientY - (box.top + box.height / 2)) / (box.height / 2)
    rawX.set(Math.max(-1, Math.min(1, dx)) * strength)
    rawY.set(Math.max(-1, Math.min(1, dy)) * strength)
  }

  const reset = () => {
    rawX.set(0)
    rawY.set(0)
  }

  return (
    <span
      ref={hostRef}
      onPointerMove={pointerMotion ? onMove : undefined}
      onPointerLeave={pointerMotion ? reset : undefined}
      // Focus must never leave the control offset from its real position.
      onBlurCapture={reset}
      className={`inline-block ${className}`}
    >
      <m.span style={pointerMotion ? { x, y } : undefined} className="inline-block">
        {children}
      </m.span>
    </span>
  )
}

/**
 * Card tilt. Same idea as Magnetic but rotates instead of translating, and reads the
 * pointer against the card's own box.
 *
 * Capped at 4 degrees. Past roughly 5 the perspective distortion becomes visible as an
 * effect in itself, and photography starts to look like it is sitting on a wobbling
 * plate rather than lying flat on the page.
 */
export function Tilt({
  children,
  className = '',
  max = 4,
  style,
}: {
  children: ReactNode
  className?: string
  max?: number
  /** Forwarded to the host element. <Stagger> clones a `--i` in here, so it must land. */
  style?: React.CSSProperties
}) {
  const { pointerMotion } = useMotionAllowed()
  const hostRef = useRef<HTMLDivElement | null>(null)

  const rawRotateX = useMotionValue(0)
  const rawRotateY = useMotionValue(0)
  const rotateX = useSpring(rawRotateX, FOLLOW_SPRING)
  const rotateY = useSpring(rawRotateY, FOLLOW_SPRING)

  const onMove = (event: React.PointerEvent) => {
    const box = hostRef.current?.getBoundingClientRect()
    if (!box) return
    const px = (event.clientX - (box.left + box.width / 2)) / (box.width / 2)
    const py = (event.clientY - (box.top + box.height / 2)) / (box.height / 2)
    // Pointer above centre tips the top edge away, which is what "leaning into it" looks like.
    rawRotateX.set(-py * max)
    rawRotateY.set(px * max)
  }

  const reset = () => {
    rawRotateX.set(0)
    rawRotateY.set(0)
  }

  return (
    <div
      ref={hostRef}
      onPointerMove={pointerMotion ? onMove : undefined}
      onPointerLeave={pointerMotion ? reset : undefined}
      className={className}
      style={pointerMotion ? { ...style, perspective: 1200 } : style}
    >
      <m.div
        style={pointerMotion ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
        className="h-full"
      >
        {children}
      </m.div>
    </div>
  )
}

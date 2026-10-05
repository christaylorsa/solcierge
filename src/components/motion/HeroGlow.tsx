'use client'

import { useEffect, useRef } from 'react'

/**
 * A soft gold pool of light that tracks the cursor across the hero.
 *
 * Double-gated: this component refuses to attach a listener on touch or when
 * reduced motion is requested, and globals.css hides `.hero-glow` outright on
 * coarse pointers. Position updates are written to a CSS variable inside a rAF,
 * so a fast mouse cannot queue more work than a frame can absorb.
 */
export function HeroGlow() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const precise = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!precise || calm) return

    const host = element.parentElement
    if (!host) return

    let frame = 0
    let pending: { x: number; y: number } | null = null

    const paint = () => {
      frame = 0
      if (!pending) return
      element.style.setProperty('--gx', `${pending.x}%`)
      element.style.setProperty('--gy', `${pending.y}%`)
      pending = null
    }

    const onMove = (event: PointerEvent) => {
      const box = host.getBoundingClientRect()
      pending = {
        x: ((event.clientX - box.left) / box.width) * 100,
        y: ((event.clientY - box.top) / box.height) * 100,
      }
      if (!frame) frame = requestAnimationFrame(paint)
    }

    host.addEventListener('pointermove', onMove)
    return () => {
      host.removeEventListener('pointermove', onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return <div ref={ref} className="hero-glow" aria-hidden="true" />
}

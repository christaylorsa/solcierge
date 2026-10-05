'use client'

import { useEffect, useState } from 'react'

/**
 * Film grain and a soft vignette over the hero.
 *
 * The grain is one small tiling SVG noise texture, stepped through four positions so
 * it shimmers the way real emulsion does. Two details make it read as film rather
 * than as a noise filter:
 *
 *   - `steps(4)` rather than a smooth animation. Grain jumps between frames, it does
 *     not slide, and a linear tween looks like drifting dust.
 *   - 8% opacity in overlay blend. High enough to break the flat gradient into
 *     something that looks photographed, low enough that you would not name it if
 *     asked what was on screen.
 *
 * Rendered as a data-URI background rather than a canvas: no rAF loop, no main-thread
 * cost, and the compositor handles it. Skipped entirely for reduced motion, where the
 * static vignette alone carries the look.
 */
export function FilmGrain({ vignette = true }: { vignette?: boolean }) {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    setAnimate(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  return (
    <>
      <div className={`film-grain ${animate ? 'film-grain--animate' : ''}`} aria-hidden="true" />
      {vignette ? <div className="film-vignette" aria-hidden="true" /> : null}
    </>
  )
}

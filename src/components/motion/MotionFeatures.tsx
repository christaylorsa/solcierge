'use client'

import { LazyMotion, domAnimation } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Loads only the Framer features this product actually uses.
 *
 * The full `motion` component bundles layout projection, drag, pan and gesture
 * handling. None of that appears here: every animated value is a transform or an
 * opacity driven by scroll offset or pointer position. `domAnimation` covers exactly
 * that and is markedly smaller.
 *
 * `strict` makes the saving enforceable rather than aspirational: with it set, any
 * `motion.div` left in the tree throws instead of quietly pulling the full bundle back
 * in. Every animated element in this codebase uses `m.` for that reason.
 */
export function MotionFeatures({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  )
}

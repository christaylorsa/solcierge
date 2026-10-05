'use client'

import { useEffect, useState } from 'react'

export type MotionCapability = {
  /** The visitor asked for less motion. Every non-essential effect must respect this. */
  reduced: boolean
  /** A mouse or trackpad, not a finger. Gates cursor, tilt and magnetic effects. */
  precise: boolean
  /** Shorthand: run pointer-driven motion at all. */
  pointerMotion: boolean
  /** True once the media queries have been read, so nothing renders on a guess. */
  ready: boolean
}

/**
 * One place that answers "is this device and this person up for motion?".
 *
 * Starts pessimistic (reduced, not precise) and only opts in after mount. That
 * ordering matters: it means the server-rendered markup and first paint are the
 * static, accessible version, and motion is added afterwards. Getting it the other
 * way round gives a flash of animation to people who asked not to see any.
 *
 * Both queries are watched live, so toggling the OS setting takes effect without a
 * reload.
 */
export function useMotionAllowed(): MotionCapability {
  const [state, setState] = useState<MotionCapability>({
    reduced: true,
    precise: false,
    pointerMotion: false,
    ready: false,
  })

  useEffect(() => {
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const preciseQuery = window.matchMedia('(hover: hover) and (pointer: fine)')

    const sync = () => {
      const reduced = reducedQuery.matches
      const precise = preciseQuery.matches
      setState({ reduced, precise, pointerMotion: precise && !reduced, ready: true })
    }

    sync()
    reducedQuery.addEventListener('change', sync)
    preciseQuery.addEventListener('change', sync)

    return () => {
      reducedQuery.removeEventListener('change', sync)
      preciseQuery.removeEventListener('change', sync)
    }
  }, [])

  return state
}

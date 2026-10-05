/**
 * The motion vocabulary. Every animated value in the product resolves to a curve and
 * a duration from this file, the same way every colour resolves to a token in
 * globals.css. Three curves, no more: adding a fourth is how a site starts to feel
 * like several sites.
 *
 * The CSS twins of these curves live in globals.css as --ease, --ease-expo and
 * --ease-soft. Keep the two in step.
 */

export const EASE = {
  /**
   * The house curve. Quick to commit, long settle. Used for anything that arrives:
   * fades, rises, hover lifts.
   */
  out: [0.16, 0.84, 0.44, 1],
  /**
   * Almost no acceleration and a very long tail. Reserved for masked reveals and the
   * hero, where the point is that the movement decelerates for longer than feels
   * necessary. That over-long settle is most of what reads as expensive.
   */
  expo: [0.16, 1, 0.3, 1],
  /**
   * Symmetric. Only for things that go out the way they came in, crossfades and
   * cursor follow. The house curve on a fade looks lopsided.
   */
  soft: [0.5, 0, 0.2, 1],
} as const

export const DUR = {
  /** Hover feedback. Below this a hover feels laggy; above it feels slow. */
  fast: 0.45,
  /** The default arrival. */
  base: 0.8,
  /** Masked headings and the hero entrance. */
  slow: 1.1,
  /** Rules drawing, arcs sweeping, numbers counting. Deliberately unhurried. */
  drift: 1.6,
} as const

/** Stagger step between siblings, in seconds. Matches the 70ms CSS grid. */
export const STAGGER = 0.07

/**
 * Viewport margin for scroll-triggered entrances: fire a little before the element
 * is fully on screen, so the motion is finishing as the reader arrives rather than
 * starting once they are already looking at it.
 */
export const VIEWPORT_MARGIN = '0px 0px -12% 0px'

/**
 * Spring for pointer-following motion: card tilt and magnetic buttons. Heavily damped
 * and deliberately slow to settle, with no overshoot, because a luxury surface should
 * feel weighted rather than springy.
 */
export const FOLLOW_SPRING = { stiffness: 120, damping: 26, mass: 0.6 } as const


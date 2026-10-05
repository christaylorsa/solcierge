'use client'

/**
 * Two very large, very faint gold radial gradients drifting against each other behind
 * a dark section.
 *
 * The purpose is depth, not decoration: a flat near-black panel reads as an empty
 * screen, while the same panel with an almost-invisible light gradient reads as a room
 * with a lamp somewhere off frame. Peak opacity is 0.05, and the drift is a 28 and 36
 * second cycle, slow enough that the movement is never the thing you notice, only the
 * fact that the surface is not dead.
 *
 * Pure CSS keyframes on transform only, so it composites on the GPU and costs nothing
 * on the main thread. The animation is paused by the reduced-motion block in
 * globals.css, which leaves the gradients in place as static depth.
 */
export function Aurora({ className = '' }: { className?: string }) {
  return (
    <div className={`aurora ${className}`} aria-hidden="true">
      <span className="aurora-blob aurora-blob--one" />
      <span className="aurora-blob aurora-blob--two" />
    </div>
  )
}

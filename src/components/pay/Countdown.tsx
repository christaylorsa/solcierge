'use client'

import { useEffect, useState } from 'react'
import { countdown } from '@/lib/format'

/**
 * The visible half of the rate lock. Counts down to `expiresAt` and calls back once
 * when it hits zero, so the panel can move itself into its expired state rather than
 * leaving a stale amount on screen.
 */
export function Countdown({
  expiresAt,
  totalSeconds,
  onExpire,
}: {
  expiresAt: string
  totalSeconds: number
  onExpire?: () => void
}) {
  const target = Date.parse(expiresAt)
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()))

  useEffect(() => {
    setRemaining(Math.max(0, target - Date.now()))

    const tick = setInterval(() => {
      const next = Math.max(0, target - Date.now())
      setRemaining(next)
      if (next === 0) clearInterval(tick)
    }, 250)

    return () => clearInterval(tick)
  }, [target])

  useEffect(() => {
    if (remaining === 0) onExpire?.()
  }, [remaining, onExpire])

  const fraction = totalSeconds > 0 ? Math.min(1, remaining / (totalSeconds * 1000)) : 0
  const urgent = remaining > 0 && remaining < 60_000

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[0.6875rem] tracking-label uppercase text-faint">
          {remaining === 0 ? 'Rate expired' : 'Rate held for'}
        </p>
        <p
          className={`font-mono text-sm tabular-nums ${urgent ? 'text-danger' : remaining === 0 ? 'text-faint' : 'text-accent-soft'}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {countdown(remaining)}
        </p>
      </div>

      <div className="mt-2.5 h-[2px] w-full overflow-hidden bg-line" role="presentation">
        <div
          className={`h-full origin-left ${urgent ? 'bg-danger' : 'bg-accent'}`}
          style={{ transform: `scaleX(${fraction})`, transition: 'transform 250ms linear' }}
        />
      </div>
    </div>
  )
}

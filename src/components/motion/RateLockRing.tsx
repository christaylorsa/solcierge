'use client'

import { useEffect, useRef, useState } from 'react'
import { Odometer } from './Odometer'

const SIZE = 260
const STROKE = 2
const RADIUS = (SIZE - STROKE * 8) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * The rate-lock ring: a gold arc unwinding over ten minutes with the remaining time
 * rolling beneath it.
 *
 * This is the site's signature interaction, and the brief for it was "proof of trust",
 * so it is built to be legible rather than impressive. Choices that follow from that:
 *
 *   - The arc unwinds anticlockwise from full, so the gold that remains is the time
 *     that remains. A filling arc would show elapsed time and read as a progress bar,
 *     which says the opposite thing.
 *   - It ticks on a 1s interval driven by wall-clock arithmetic, not by animating a
 *     value. A countdown that tweens can show a number that was never true, and this
 *     component's entire job is to be believable about time.
 *   - The stroke transitions over 1s linear, so the arc glides continuously between
 *     ticks instead of stepping. Linear is right here and nowhere else: real time does
 *     not ease.
 *   - Under a minute the ring turns to the danger token. No pulsing, no flashing. The
 *     colour change alone is enough, and a blinking element in a payment flow reads as
 *     panic.
 *
 * `demo` runs it as a looping ten-minute cycle for the marketing section. The live pay
 * panel passes a real expiry instead.
 */
export function RateLockRing({
  /** Total lock window in seconds. */
  totalSeconds = 600,
  /** ISO timestamp to count down to. Omit for the looping marketing demo. */
  expiresAt,
  className = '',
}: {
  totalSeconds?: number
  expiresAt?: string
  className?: string
}) {
  const [remaining, setRemaining] = useState(totalSeconds * 1000)
  const cycleStart = useRef(0)

  useEffect(() => {
    const tick = () => {
      if (expiresAt) {
        setRemaining(Math.max(0, Date.parse(expiresAt) - Date.now()))
        return
      }
      // Demo mode: a continuous ten-minute loop, so the section is never showing a
      // dead 0:00 to someone who arrives late.
      if (!cycleStart.current) cycleStart.current = Date.now()
      const elapsed = (Date.now() - cycleStart.current) % (totalSeconds * 1000)
      setRemaining(totalSeconds * 1000 - elapsed)
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [expiresAt, totalSeconds])

  const fraction = Math.max(0, Math.min(1, remaining / (totalSeconds * 1000)))
  const seconds = Math.ceil(remaining / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  const clock = `${minutes}:${secs.toString().padStart(2, '0')}`

  const urgent = remaining > 0 && remaining < 60_000
  const stroke = urgent ? 'rgb(var(--danger))' : 'rgb(var(--accent))'

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Rate locked for ${clock}`}
      >
        {/* Track. Deliberately faint: the eye should read the gold, not the groove. */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgb(var(--accent) / 0.12)"
          strokeWidth={STROKE}
        />
        <circle
          className="lock-arc"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={stroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          style={{
            // Linear, because time does not ease. 1s matches the tick exactly, so the
            // arc arrives at each new position precisely as the next tick fires.
            transition: 'stroke-dashoffset 1s linear, stroke 0.6s var(--ease)',
          }}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="eyebrow">Rate held</p>
        {/* The .odometer class supplies the tabular face and weight; only size and
            colour are set here. */}
        <Odometer
          value={clock}
          label={`${minutes} minutes ${secs} seconds remaining`}
          className={`mt-3 text-[2.75rem] ${urgent ? 'text-danger' : 'text-ink'}`}
        />
      </div>
    </div>
  )
}

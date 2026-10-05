'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const WORDS = ['anything.', 'everything.', 'the impossible.']
const HOLD_MS = 3800

/**
 * The rotating half of "Book anything."
 *
 * The hard problem here is width. Three words of different lengths cannot swap in an
 * inline flow without either shifting the line or animating `width`, and animating
 * width means a layout pass every frame, which the performance guardrail rules out.
 *
 * The fix is an inline grid with every variant stacked in the same cell. The container
 * sizes itself to the longest word once, at layout, and never changes again; the
 * variants cross-fade in place on transform and opacity only. Each variant still
 * shrink-wraps its own text, so the gold rule beneath matches the word above it rather
 * than the widest word in the set. Because this word ends its line, the leftover space
 * after a shorter word falls where nothing follows it, so it is invisible.
 *
 * Characters enter on a 26ms stagger: fast enough to read as one word arriving rather
 * than as letters being dealt out. The rule sweeps left to right on each change.
 *
 * Under reduced motion this is the first word, static, with the rule already drawn.
 */
export function RotatingWord() {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reduced) return
    const timer = setInterval(() => setIndex((current) => (current + 1) % WORDS.length), HOLD_MS)
    return () => clearInterval(timer)
  }, [reduced])

  if (reduced) {
    return (
      <span className="relative inline-block">
        {WORDS[0]}
        <span
          className="absolute -bottom-[0.04em] left-0 h-[2px] w-full bg-accent/60"
          aria-hidden="true"
        />
      </span>
    )
  }

  return (
    <span className="inline-grid align-bottom">
      {/* One live region announcing the current word, rather than three hidden copies. */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {WORDS[index]}
      </span>

      {WORDS.map((word, wordIndex) => {
        const active = wordIndex === index
        return (
          <span
            key={word}
            aria-hidden="true"
            // Every variant sits in the same grid cell, so the box is as wide as the
            // longest one and nothing reflows when the word changes. justify-self keeps
            // each variant shrink-wrapped to its own text.
            className="relative col-start-1 row-start-1 justify-self-start"
          >
            {word.split('').map((char, charIndex) => (
              <span
                key={charIndex}
                className="inline-block whitespace-pre"
                style={{
                  opacity: active ? 1 : 0,
                  transform: active ? 'translateY(0)' : 'translateY(0.42em)',
                  transition: `opacity 0.5s var(--ease-soft) ${charIndex * 26}ms, transform 0.9s var(--ease-expo) ${charIndex * 26}ms`,
                }}
              >
                {char}
              </span>
            ))}

            {/* Sweeps out under the word that just arrived, and retracts as it leaves. */}
            <span
              className="absolute -bottom-[0.04em] left-0 h-[2px] w-full origin-left bg-accent/60"
              style={{
                transform: active ? 'scaleX(1)' : 'scaleX(0)',
                transition: `transform ${active ? '1.2s' : '0.5s'} var(--ease-expo) ${active ? '0.18s' : '0s'}`,
              }}
            />
          </span>
        )
      })}
    </span>
  )
}

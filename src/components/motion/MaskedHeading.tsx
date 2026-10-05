'use client'

import type { ElementType, ReactNode } from 'react'
import { useReveal } from '@/hooks/useReveal'

/**
 * A heading whose lines rise from behind their own edge.
 *
 * Deliberately CSS and not Framer. An entrance is a one-shot transition between two
 * states, which is exactly what a CSS transition is for, and it means the heading is
 * driven by the same single IntersectionObserver as every other reveal on the site
 * rather than by a second system. Framer is reserved for motion that tracks a
 * continuous input (scroll offset, pointer position), where it genuinely earns its
 * weight.
 *
 * Lines are authored, not measured. Splitting rendered text into visual lines means
 * reading layout back after paint, which janks and breaks on font swap and resize.
 * Passing the break points explicitly gives full typographic control and costs
 * nothing at runtime.
 */
export function MaskedHeading({
  lines,
  as: Tag = 'h2',
  className = '',
  lineClassName = '',
  /** Continues the delay sequence from an earlier element. */
  offset = 0,
}: {
  lines: ReactNode[]
  as?: ElementType
  className?: string
  lineClassName?: string
  offset?: number
}) {
  const ref = useReveal<HTMLElement>()

  return (
    <Tag ref={ref} className={`mask-reveal ${className}`}>
      {lines.map((line, index) => (
        <span className="mask-line" key={index}>
          <span style={{ ['--i' as string]: index + offset }} className={lineClassName}>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  )
}

/**
 * Section label with a hairline that draws out beside it.
 *
 * The label is masked and the rule is a scaleX, both on the expo curve. The rule
 * starts 150ms after the text so it reads as a consequence of the label arriving
 * rather than as a second thing happening at the same time.
 */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>()

  return (
    <div ref={ref} className={`eyebrow-rule mask-reveal ${className}`}>
      <span className="mask-line">
        <span className="eyebrow">{children}</span>
      </span>
      <span className="eyebrow-line" aria-hidden="true" />
    </div>
  )
}

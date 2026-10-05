'use client'

import { Children, type ElementType, type ReactNode, isValidElement, cloneElement } from 'react'
import { useReveal } from '@/hooks/useReveal'

type RevealProps = {
  children: ReactNode
  className?: string
  as?: ElementType
  /** Nudges this element's start relative to its siblings, in the same 70ms grid. */
  delayIndex?: number
}

/** Fade-and-rise on arrival. The single move most sections get. */
export function Reveal({ children, className = '', as: Tag = 'div', delayIndex }: RevealProps) {
  const ref = useReveal<HTMLElement>()
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={delayIndex ? { transitionDelay: `${delayIndex * 70}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}

/** Reveals direct children in sequence. The delay is CSS, driven by an inline --i. */
export function Stagger({ children, className = '', as: Tag = 'div' }: RevealProps) {
  const ref = useReveal<HTMLElement>()
  return (
    <Tag ref={ref} className={`stagger ${className}`}>
      {Children.map(children, (child, index) =>
        isValidElement<{ style?: React.CSSProperties }>(child)
          ? cloneElement(child, {
              style: { ...(child.props.style ?? {}), ['--i' as string]: index },
            })
          : child,
      )}
    </Tag>
  )
}

/** A headline that arrives word by word. Splits on spaces and keeps them selectable. */
export function StaggerWords({
  text,
  className = '',
  as: Tag = 'h1',
  offset = 0,
}: {
  text: string
  className?: string
  as?: ElementType
  /** Continues the index sequence from an earlier line, so multi-line headings flow. */
  offset?: number
}) {
  const ref = useReveal<HTMLElement>()
  const words = text.split(' ')

  return (
    <Tag ref={ref} className={`stagger-words ${className}`}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} style={{ ['--i' as string]: index + offset }}>
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}

/** Hairline that draws itself in. Sits between sections instead of a hard border. */
export function SectionDivider({ className = '' }: { className?: string }) {
  const ref = useReveal<HTMLDivElement>()
  return <div ref={ref} className={`section-divider ${className}`} aria-hidden="true" />
}

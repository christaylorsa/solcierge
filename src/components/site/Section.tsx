import type { ReactNode } from 'react'
import { Eyebrow, MaskedHeading } from '@/components/motion/MaskedHeading'

/** Consistent vertical rhythm and gutter for every band on the page. */
export function Section({
  children,
  id,
  className = '',
  tone = 'bg',
}: {
  children: ReactNode
  id?: string
  className?: string
  tone?: 'bg' | 'surface'
}) {
  return (
    <section
      id={id}
      className={`${tone === 'surface' ? 'bg-surface' : 'bg-bg'} px-[var(--shell-x)] py-24 sm:py-32 ${className}`}
    >
      <div className="mx-auto max-w-shell">{children}</div>
    </section>
  )
}

export function SectionHead({
  eyebrow,
  title,
  lede,
  align = 'left',
}: {
  eyebrow: string
  title: string
  lede?: string
  align?: 'left' | 'center'
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <Eyebrow className={align === 'center' ? 'justify-center' : ''}>{eyebrow}</Eyebrow>
      <MaskedHeading
        lines={[title]}
        className="display mt-5 text-[clamp(2.25rem,5vw,3.5rem)] text-ink"
      />
      {lede ? <p className="lede mt-6">{lede}</p> : null}
    </div>
  )
}

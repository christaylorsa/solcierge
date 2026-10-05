'use client'

import { useRef } from 'react'
import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { SectionDivider } from '@/components/motion/Reveal'
import { Eyebrow, MaskedHeading } from '@/components/motion/MaskedHeading'
import { Section } from '@/components/site/Section'

const STEPS = [
  {
    n: '01',
    title: 'Connect and brief',
    body: 'Your wallet is your account, so there is no password and no application form. Pick a category, give us dates, place, party size and a budget band, then tell us what actually matters.',
  },
  {
    n: '02',
    title: 'We source, then quote',
    body: 'A concierge works the request against vetted operators and suppliers. You get one figure in USD with what it includes and what it does not, plus the reasoning behind it.',
  },
  {
    n: '03',
    title: 'Settle in SOL or USDC',
    body: 'Choose your asset. USD converts to SOL at a live rate that holds for ten minutes, counting down on screen. Your wallet signs one transfer to our treasury.',
  },
  {
    n: '04',
    title: 'We verify and fulfil',
    body: 'Our server reads the transaction from the chain and checks recipient, asset and amount before anything is marked paid. Then we confirm the booking and hand you the details.',
  },
]

export function HowItWorks() {
  return (
    <Section id="how">
      <div className="max-w-2xl">
        <Eyebrow>The process</Eyebrow>
        <MaskedHeading
          lines={['Four steps, no auction']}
          className="display mt-5 text-[clamp(2.25rem,5vw,3.5rem)] text-ink"
        />
        <p className="lede mt-6">
          We are a request-and-fulfil desk, not a marketplace. Nothing is listed, nothing is
          bid on, and no supplier sees your budget.
        </p>
      </div>

      <div className="mt-16">
        {STEPS.map((step) => (
          <Step key={step.n} step={step} />
        ))}
        <SectionDivider />
      </div>
    </Section>
  )
}

/**
 * One step, with its numeral drifting against the copy as it passes.
 *
 * The numeral travels 40px over the full height of the row while the text stays put.
 * That differential is the entire effect, and at 7% accent opacity the numeral is
 * closer to a watermark than to a graphic: you read the layer, not the movement.
 *
 * Each row measures its own scroll progress rather than sharing the section's, so the
 * numerals do not all move in lockstep. `useScroll` reads offsets off the compositor
 * and writes to a transform, so there is no layout read per frame.
 */
function Step({ step }: { step: (typeof STEPS)[number] }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], [20, -20])

  return (
    <div>
      <SectionDivider />
      <div
        ref={ref}
        className="grid gap-4 py-10 md:grid-cols-[auto_1fr_2fr] md:gap-12 md:items-baseline"
      >
        <m.p
          className="ghost-numeral"
          style={reduced ? undefined : { y }}
          aria-hidden="true"
        >
          {step.n}
        </m.p>
        <h3 className="display text-2xl text-ink md:text-3xl">
          <span className="sr-only">Step {step.n}. </span>
          {step.title}
        </h3>
        <p className="max-w-prose text-sm leading-relaxed text-muted">{step.body}</p>
      </div>
    </div>
  )
}

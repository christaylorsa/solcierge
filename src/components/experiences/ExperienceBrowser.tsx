'use client'

import { useState } from 'react'
import { ExperienceGrid } from './ExperienceGrid'
import { EXPERIENCES, EXPERIENCE_REGIONS, experiencesIn, type ExperienceRegion } from '@/lib/experiences'

/**
 * Every experience on one page. "All" shows each region under its own heading, in
 * rows of three; a region filter shows just that region.
 */
export function ExperienceBrowser() {
  const [region, setRegion] = useState<ExperienceRegion | null>(null)
  const shown = region ? [region] : [...EXPERIENCE_REGIONS]

  const options: { label: string; value: ExperienceRegion | null; count: number }[] = [
    { label: 'All', value: null, count: EXPERIENCES.length },
    ...EXPERIENCE_REGIONS.map((value) => ({ label: value, value, count: experiencesIn(value).length })),
  ]

  return (
    <div className="mt-14">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter experiences by region">
        {options.map((option) => {
          const selected = region === option.value
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={selected}
              onClick={() => setRegion(option.value)}
              className={`inline-flex items-center gap-2 border px-4 py-2 text-xs tracking-wide transition-colors duration-300 ease ${
                selected
                  ? 'border-accent bg-accent/10 text-accent-soft'
                  : 'border-line text-muted hover:border-accent/50 hover:text-ink'
              }`}
            >
              {option.label}
              <span className="text-faint">{option.count}</span>
            </button>
          )
        })}
      </div>

      {/* Keyed on the filter so the cards stagger in again rather than popping. */}
      <div key={region ?? 'all'} className="mt-12 space-y-20">
        {shown.map((name, index) => (
          <section key={name} aria-labelledby={`region-${index}`}>
            <div className="flex items-baseline justify-between gap-6 border-b border-line pb-4">
              <h2 id={`region-${index}`} className="display text-[clamp(1.75rem,3.5vw,2.5rem)] text-ink">
                {name}
              </h2>
              <p className="text-xs tracking-label uppercase text-faint">{experiencesIn(name).length} experiences</p>
            </div>
            <ExperienceGrid experiences={experiencesIn(name)} className="mt-8" eager={index === 0 ? 3 : 0} />
          </section>
        ))}
      </div>
    </div>
  )
}

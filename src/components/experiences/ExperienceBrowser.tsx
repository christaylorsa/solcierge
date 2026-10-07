'use client'

import { useState } from 'react'
import { ExperienceGrid } from './ExperienceGrid'
import { EXPERIENCES, EXPERIENCE_REGIONS, type ExperienceRegion } from '@/lib/experiences'

/** Every experience on one page, with a region filter for browsing. */
export function ExperienceBrowser() {
  const [region, setRegion] = useState<ExperienceRegion | null>(null)
  const shown = region ? EXPERIENCES.filter((experience) => experience.region === region) : EXPERIENCES

  const options: { label: string; value: ExperienceRegion | null; count: number }[] = [
    { label: 'All', value: null, count: EXPERIENCES.length },
    ...EXPERIENCE_REGIONS.map((value) => ({
      label: value,
      value,
      count: EXPERIENCES.filter((experience) => experience.region === value).length,
    })),
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
      <ExperienceGrid key={region ?? 'all'} experiences={shown} className="mt-10" eager={3} />
    </div>
  )
}

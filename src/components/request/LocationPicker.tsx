'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { loadAirports } from '@/lib/airports'
import {
  buildPlaceIndex,
  featuredPlaces,
  kindLabel,
  placeValue,
  searchPlaces,
  type Place,
  type PlaceCategory,
  type PlaceIndex,
} from '@/lib/places'

/**
 * The "Where" field for every category except flights.
 *
 * Popular picks sit above as one-click chips. Below them, a search box looks
 * through the category's curated list straight away, and through every city with
 * an airport once that list has loaded (fetched on first focus, shared with the
 * flight fields). Anything typed by hand is still sent as is: "somewhere quiet
 * near Gstaad" is a perfectly good brief.
 */
export function LocationPicker({
  category,
  value,
  onChange,
  label,
  hint,
  placeholder,
}: {
  category: PlaceCategory
  value: string
  onChange: (value: string) => void
  label: string
  hint: string
  placeholder: string
}) {
  const id = useId()
  const inputId = `${id}-input`
  const listId = `${id}-list`
  const picks = useMemo(() => featuredPlaces(category), [category])

  const [index, setIndex] = useState<PlaceIndex>(() => buildPlaceIndex(category))
  const [withCities, setWithCities] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const results = useMemo(() => searchPlaces(index, value), [index, value])
  useEffect(() => setActive(0), [value])

  function warm() {
    if (withCities) return
    setWithCities(true)
    loadAirports()
      .then((airports) => setIndex(buildPlaceIndex(category, airports)))
      .catch((error) => {
        // The curated list still works; only the world-city fallback is missing.
        console.warn('[places]', error)
        setWithCities(false)
      })
  }

  function pick(place: Place) {
    onChange(placeValue(place))
    setOpen(false)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (current + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => (current - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      pick(results[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  // Once something is picked, the list would only offer the same thing back.
  const exact = results.length === 1 && placeValue(results[0]) === value
  const showList = open && results.length > 0 && !exact

  return (
    <div>
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>

      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={`Popular choices for ${label.toLowerCase()}`}>
        {picks.map((place) => {
          const selected = value === placeValue(place)
          return (
            <button
              key={place.name}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? '' : placeValue(place))}
              title={place.kind === 'event' && place.when ? `${place.area}, ${place.when}` : place.area}
              className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs tracking-wide transition-colors duration-300 ease ${
                selected
                  ? 'border-accent bg-accent/10 text-accent-soft'
                  : 'border-line text-muted hover:border-accent/50 hover:text-ink'
              }`}
            >
              {selected ? (
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M1.5 5.2l2.2 2.2L8.5 2.6" stroke="currentColor" strokeWidth="1.3" fill="none" />
                </svg>
              ) : null}
              {place.name}
            </button>
          )
        })}
      </div>

      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <input
          id={inputId}
          className="field !pl-10 !pr-10"
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            warm()
            setOpen(true)
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={160}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          aria-describedby={`${id}-hint`}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-faint transition-colors duration-300 ease hover:text-ink"
          >
            <svg width="10" height="10" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.4" fill="none" />
            </svg>
          </button>
        ) : null}

        {showList ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded border border-line bg-raised py-1 shadow-2xl"
          >
            {results.map((place, position) => (
              <li
                key={`${place.kind}-${place.name}-${place.area}`}
                id={`${listId}-${position}`}
                role="option"
                aria-selected={position === active}
                // mousedown, not click: it fires before the input's blur closes the list.
                onMouseDown={(event) => {
                  event.preventDefault()
                  pick(place)
                }}
                onMouseEnter={() => setActive(position)}
                className={`flex cursor-pointer items-baseline justify-between gap-4 px-3.5 py-2.5 ${
                  position === active ? 'bg-accent/10' : ''
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">{place.name}</span>
                  <span className="block truncate text-xs text-faint">{place.area}</span>
                </span>
                <span className="shrink-0 text-[0.625rem] tracking-label uppercase text-accent">{kindLabel(place)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <span id={`${id}-hint`} className="mt-2 block text-xs text-faint">
        {hint}
      </span>
    </div>
  )
}

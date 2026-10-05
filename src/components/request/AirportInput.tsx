'use client'

import { useEffect, useId, useState } from 'react'
import {
  airportCodes,
  airportValue,
  loadAirports,
  searchAirports,
  type Airport,
  type AirportIndex,
} from '@/lib/airports'

/**
 * Free-text field with an airport picker underneath. Typing a city, airport name
 * or IATA/ICAO code offers matches; picking one fills the field with a full,
 * unambiguous description. Anything typed by hand is still accepted, since the
 * desk can work with "somewhere near Gstaad" as well as with LSGS.
 */
export function AirportInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const listId = useId()
  const [index, setIndex] = useState<AirportIndex | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [results, setResults] = useState<Airport[]>([])

  useEffect(() => {
    setResults(index ? searchAirports(index, value) : [])
    setActive(0)
  }, [index, value])

  function warm() {
    if (index) return
    loadAirports()
      .then(setIndex)
      .catch((error) => console.warn('[airports]', error))
  }

  function pick(airport: Airport) {
    onChange(airportValue(airport))
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

  const showList = open && results.length > 0

  return (
    <div className="relative">
      <input
        className="field"
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
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
      />

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded border border-line bg-raised py-1 shadow-2xl"
        >
          {results.map((airport, position) => (
            <li
              key={`${airport.icao}-${airport.iata}-${airport.name}`}
              id={`${listId}-${position}`}
              role="option"
              aria-selected={position === active}
              // mousedown, not click: it fires before the input's blur closes the list.
              onMouseDown={(event) => {
                event.preventDefault()
                pick(airport)
              }}
              onMouseEnter={() => setActive(position)}
              className={`flex cursor-pointer items-baseline justify-between gap-4 px-3.5 py-2.5 ${
                position === active ? 'bg-accent/10' : ''
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-ink">{airport.name}</span>
                <span className="block truncate text-xs text-faint">
                  {[airport.city, airport.country].filter(Boolean).join(', ')}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs tracking-wider text-accent">{airportCodes(airport)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

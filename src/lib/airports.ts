/**
 * Airport search for the route fields.
 *
 * The data is OurAirports (public domain), compacted by scripts/build-airports.mjs
 * into public/data/airports.json and fetched by the browser on first focus. Search
 * runs locally over that list, so there is no API key, no rate limit and no
 * request per keystroke.
 */

/** [iata, icao, name, city, isoCountry, size (0 large, 1 medium, 2 small), keywords] */
export type AirportRow = [string, string, string, string, string, number, string]

export type Airport = {
  iata: string
  icao: string
  name: string
  city: string
  country: string
  size: number
}

type Indexed = Airport & {
  nName: string
  nCity: string
  nKeywords: string
  nCountry: string
}

export type AirportIndex = Indexed[]

const MAX_VALUE_LENGTH = 120

/** Lowercase and strip accents, so "zurich" finds Zürich and "sao paulo" finds São Paulo. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

let displayNames: Intl.DisplayNames | null | undefined
function countryName(iso: string): string {
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
    } catch {
      displayNames = null
    }
  }
  try {
    return displayNames?.of(iso) ?? iso
  } catch {
    return iso
  }
}

export function buildIndex(rows: AirportRow[]): AirportIndex {
  return rows.map(([iata, icao, name, city, iso, size, keywords]) => {
    const country = countryName(iso)
    return {
      iata,
      icao,
      name,
      city,
      country,
      size,
      nName: normalize(name),
      nCity: normalize(city),
      nKeywords: normalize(keywords),
      nCountry: normalize(country),
    }
  })
}

function wordStarts(haystack: string, needle: string): boolean {
  return haystack.split(/[\s,()/-]+/).some((word) => word.startsWith(needle))
}

function score(airport: Indexed, q: string, upper: string): number {
  if (upper.length === 3 && airport.iata === upper) return 100
  if (upper.length === 4 && airport.icao === upper) return 95

  if (airport.nCity.startsWith(q)) return 70
  if (airport.nKeywords.split(/,\s*/).some((keyword) => keyword.startsWith(q))) return 60
  if (airport.nName.startsWith(q)) return 55
  if (wordStarts(airport.nCity, q)) return 50
  if (wordStarts(airport.nName, q)) return 45
  if (q.length < 3 && airport.iata.startsWith(upper)) return 30
  if (q.length >= 4 && airport.nCountry.startsWith(q)) return 10
  return 0
}

/** Best matches first; within a tier, larger airports first. */
export function searchAirports(index: AirportIndex, query: string, limit = 8): Airport[] {
  const q = normalize(query)
  if (q.length < 2) return []
  const upper = q.toUpperCase()

  const hits: { airport: Indexed; points: number }[] = []
  for (const airport of index) {
    const base = score(airport, q, upper)
    if (base > 0) hits.push({ airport, points: base - airport.size * 6 })
  }

  hits.sort((a, b) => b.points - a.points || a.airport.name.localeCompare(b.airport.name))
  return hits.slice(0, limit).map(({ airport }) => ({
    iata: airport.iata,
    icao: airport.icao,
    name: airport.name,
    city: airport.city,
    country: airport.country,
    size: airport.size,
  }))
}

export function airportCodes(airport: Airport): string {
  return [airport.iata, airport.icao].filter(Boolean).join(' / ')
}

/** The text stored on the request once an airport is picked. Fits the API's 120-char limit. */
export function airportValue(airport: Airport): string {
  const place = [airport.city, airport.country].filter(Boolean).join(', ')
  const full = `${airport.name} (${airportCodes(airport)})${place ? `, ${place}` : ''}`
  if (full.length <= MAX_VALUE_LENGTH) return full
  const short = `${airport.name} (${airportCodes(airport)})`
  return short.length <= MAX_VALUE_LENGTH ? short : short.slice(0, MAX_VALUE_LENGTH)
}

let loading: Promise<AirportIndex> | null = null

/** Fetched once per page load and shared by every airport field on the page. */
export function loadAirports(): Promise<AirportIndex> {
  loading ??= fetch('/data/airports.json')
    .then((res) => {
      if (!res.ok) throw new Error(`Airport list responded ${res.status}`)
      return res.json() as Promise<AirportRow[]>
    })
    .then(buildIndex)
    .catch((error) => {
      loading = null
      throw error
    })
  return loading
}

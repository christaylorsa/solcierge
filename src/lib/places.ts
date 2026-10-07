/**
 * Places for the "Where" field on every category except flights (which pick
 * airports, see airports.ts).
 *
 * Two sources, searched together:
 *   1. A curated list per category, written by hand: the destinations, cruising
 *      grounds, cities and events the desk actually books. These come first and
 *      carry the one-click "popular" picks.
 *   2. Every city that has an airport, derived from the airport list the browser
 *      already loads for flights (about 8,000 worldwide), so a member in Leeds or
 *      Lagos still finds their city without a paid places API.
 *
 * Whatever is picked becomes plain text on the request, and anything typed by hand
 * is still accepted. Import-free so it is unit-tested directly.
 */
import { normalize, type Airport } from './airports.ts'

export type PlaceKind = 'destination' | 'cruising' | 'city' | 'event' | 'region'

export type Place = {
  name: string
  /** Country, region or venue. Shown under the name and kept on the request. */
  area: string
  kind: PlaceKind
  /** Events: when it usually runs. Shown, never stored. */
  when?: string
  /** Other names a member might type: "St Barts", "Cote d'Azur". */
  keywords?: string
}

const KIND_LABEL: Record<PlaceKind, string> = {
  destination: 'Destination',
  cruising: 'Cruising ground',
  city: 'City',
  event: 'Event',
  region: 'Region',
}

export function kindLabel(place: Place): string {
  return place.kind === 'event' && place.when ? `${KIND_LABEL.event} · ${place.when}` : KIND_LABEL[place.kind]
}

const MAX_VALUE_LENGTH = 160

/** The text stored on the request once a place is picked. */
export function placeValue(place: Place): string {
  const full = place.kind === 'event' ? `${place.name} · ${place.area}` : `${place.name}, ${place.area}`
  return full.length <= MAX_VALUE_LENGTH ? full : full.slice(0, MAX_VALUE_LENGTH)
}

// --- the curated lists -----------------------------------------------------

const d = (name: string, area: string, keywords?: string): Place => ({ name, area, kind: 'destination', keywords })
const c = (name: string, area: string, keywords?: string): Place => ({ name, area, kind: 'city', keywords })
const y = (name: string, area: string, keywords?: string): Place => ({ name, area, kind: 'cruising', keywords })
const r = (name: string, area: string, keywords?: string): Place => ({ name, area, kind: 'region', keywords })
const e = (name: string, area: string, when: string, keywords?: string): Place => ({
  name,
  area,
  kind: 'event',
  when,
  keywords,
})

/** Villa and estate destinations: islands, coasts, lakes, ski resorts. */
const DESTINATIONS: Place[] = [
  d('Mykonos', 'Greece'),
  d('Ibiza', 'Spain', 'eivissa, balearics'),
  d('St Barths', 'Caribbean', 'st barts, saint barthelemy, gustavia'),
  d('Saint-Tropez', 'France', 'st tropez, ramatuelle, cote dazur, riviera'),
  d('Lake Como', 'Italy', 'como, bellagio, cernobbio, tremezzo'),
  d('Tuscany', 'Italy', 'florence, chianti, val dorcia, siena'),
  d('Courchevel', 'French Alps', '1850, ski'),
  d('Amalfi Coast', 'Italy', 'positano, ravello, amalfi'),
  d('Marbella', 'Spain', 'puerto banus, costa del sol'),
  d('Mallorca', 'Spain', 'majorca, palma, deia, balearics'),
  d('Santorini', 'Greece', 'oia, fira'),
  d('Paros', 'Greece', 'antiparos, cyclades'),
  d('Corfu', 'Greece', 'kerkyra, ionian'),
  d('Costa Smeralda', 'Sardinia, Italy', 'porto cervo, sardinia'),
  d('Capri', 'Italy', 'anacapri'),
  d('Puglia', 'Italy', 'apulia, ostuni, fasano, salento'),
  d('Sicily', 'Italy', 'taormina, noto, siracusa'),
  d('Provence', 'France', 'luberon, gordes, aix'),
  d('Cap Ferrat', 'France', 'saint-jean-cap-ferrat, villefranche, riviera, cote dazur'),
  d('Cannes', 'France', 'riviera, cote dazur, antibes'),
  d('Comporta', 'Portugal', 'alentejo'),
  d('Algarve', 'Portugal', 'quinta do lago, vale do lobo'),
  d('Verbier', 'Swiss Alps', 'ski'),
  d('Gstaad', 'Swiss Alps', 'saanen, ski'),
  d('St. Moritz', 'Swiss Alps', 'st moritz, saint moritz, engadin, ski'),
  d('Zermatt', 'Swiss Alps', 'matterhorn, ski'),
  d('Megève', 'French Alps', 'megeve, ski'),
  d("Val d'Isère", 'French Alps', 'val disere, ski'),
  d('Aspen', 'Colorado, USA', 'snowmass, ski'),
  d('Vail', 'Colorado, USA', 'beaver creek, ski'),
  d('Jackson Hole', 'Wyoming, USA', 'ski'),
  d('The Hamptons', 'New York, USA', 'east hampton, southampton, montauk'),
  d('Malibu', 'California, USA'),
  d('Palm Beach', 'Florida, USA'),
  d('Cabo San Lucas', 'Mexico', 'los cabos'),
  d('Tulum', 'Mexico', 'riviera maya'),
  d('Turks and Caicos', 'Caribbean', 'providenciales, parrot cay'),
  d('Mustique', 'Caribbean', 'grenadines'),
  d('Barbados', 'Caribbean', 'sandy lane'),
  d('Anguilla', 'Caribbean'),
  d('Harbour Island', 'Bahamas', 'eleuthera'),
  d('Maldives', 'Indian Ocean'),
  d('Bali', 'Indonesia', 'uluwatu, seminyak, ubud'),
  d('Phuket', 'Thailand'),
  d('Koh Samui', 'Thailand'),
  d('Marrakech', 'Morocco', 'marrakesh'),
  d('Cape Town', 'South Africa', 'clifton, camps bay'),
  d('Mauritius', 'Indian Ocean'),
  d('Seychelles', 'Indian Ocean'),
  d('Bora Bora', 'French Polynesia', 'tahiti'),
  d('Niseko', 'Japan', 'hokkaido, ski'),
  d('Bodrum', 'Turkey', 'turkiye'),
  d('Dubrovnik', 'Croatia'),
  d('Cotswolds', 'England'),
  d('Scottish Highlands', 'Scotland', 'highlands'),
  d('Laikipia', 'Kenya', 'safari'),
  d('Okavango Delta', 'Botswana', 'safari'),
  d('Serengeti', 'Tanzania', 'safari'),
]

/** Charter cruising grounds, with the ports a member might name instead. */
const CRUISING: Place[] = [
  y('French Riviera', 'France and Monaco', 'cote dazur, monaco, antibes, cannes, nice, saint-tropez'),
  y('Amalfi Coast', 'Italy', 'positano, capri, naples, sorrento'),
  y('Balearic Islands', 'Spain', 'ibiza, mallorca, palma, formentera, menorca'),
  y('Sardinia and Corsica', 'Italy and France', 'porto cervo, costa smeralda, bonifacio'),
  y('Croatia', 'Adriatic', 'split, dubrovnik, hvar'),
  y('Greek Cyclades', 'Greece', 'mykonos, santorini, paros, athens'),
  y('Ionian Islands', 'Greece', 'corfu, paxos, lefkada'),
  y('Turkish Riviera', 'Turkey', 'bodrum, gocek, fethiye, turkiye'),
  y('Montenegro', 'Adriatic', 'tivat, porto montenegro, kotor'),
  y('Sicily and the Aeolian Islands', 'Italy', 'panarea, stromboli, lipari, taormina'),
  y('British Virgin Islands', 'Caribbean', 'bvi, tortola, virgin gorda'),
  y('St Barths and St Martin', 'Caribbean', 'st barts, saint martin, sint maarten, anguilla'),
  y('Bahamas', 'Caribbean', 'nassau, exumas, harbour island'),
  y('The Grenadines', 'Caribbean', 'mustique, bequia, st vincent'),
  y('Antigua', 'Caribbean', 'english harbour'),
  y('Miami and the Florida Keys', 'USA', 'miami, key west, florida'),
  y('New England', 'USA', 'newport, nantucket, marthas vineyard'),
  y('Maldives', 'Indian Ocean'),
  y('Seychelles', 'Indian Ocean'),
  y('Thailand', 'Andaman Sea', 'phuket, phang nga'),
  y('Komodo and Raja Ampat', 'Indonesia', 'flores, papua'),
  y('French Polynesia', 'South Pacific', 'tahiti, bora bora, moorea'),
  y('Galápagos', 'Ecuador', 'galapagos'),
  y('Norwegian Fjords', 'Norway', 'bergen, geiranger'),
  y('Arabian Gulf', 'UAE', 'dubai, abu dhabi'),
  y('Whitsundays', 'Australia', 'great barrier reef'),
]

/** Cities the desk books cars and tables in most. */
const CITIES: Place[] = [
  c('Monaco', 'Monaco', 'monte carlo, monte-carlo'),
  c('London', 'United Kingdom', 'mayfair, chelsea, knightsbridge'),
  c('Dubai', 'United Arab Emirates', 'uae'),
  c('Miami', 'Florida, USA', 'miami beach, south beach'),
  c('Los Angeles', 'California, USA', 'beverly hills, la, hollywood'),
  c('Paris', 'France'),
  c('Milan', 'Italy', 'milano'),
  c('Geneva', 'Switzerland', 'geneve'),
  c('Nice', 'France', 'riviera, cote dazur'),
  c('New York', 'USA', 'nyc, manhattan'),
  c('Las Vegas', 'Nevada, USA', 'vegas'),
  c('Abu Dhabi', 'United Arab Emirates', 'uae'),
  c('Riyadh', 'Saudi Arabia'),
  c('Doha', 'Qatar'),
  c('Munich', 'Germany', 'munchen'),
  c('Zurich', 'Switzerland', 'zürich'),
  c('Rome', 'Italy', 'roma'),
  c('Florence', 'Italy', 'firenze'),
  c('Barcelona', 'Spain'),
  c('Madrid', 'Spain'),
  c('Lisbon', 'Portugal', 'lisboa'),
  c('Amsterdam', 'Netherlands'),
  c('Copenhagen', 'Denmark', 'kobenhavn'),
  c('Stockholm', 'Sweden'),
  c('San Sebastián', 'Spain', 'san sebastian, donostia'),
  c('Lyon', 'France'),
  c('Tokyo', 'Japan', 'ginza, aoyama, roppongi'),
  c('Kyoto', 'Japan'),
  c('Singapore', 'Singapore'),
  c('Hong Kong', 'China'),
  c('Seoul', 'South Korea'),
  c('Bangkok', 'Thailand'),
  c('Sydney', 'Australia'),
  c('Mexico City', 'Mexico', 'cdmx'),
  c('Lima', 'Peru'),
  c('Chicago', 'Illinois, USA'),
  c('San Francisco', 'California, USA', 'sf, napa'),
  c('Napa Valley', 'California, USA', 'napa, yountville, sonoma'),
]

/** Recurring events. Months are typical, never promised: dates move year to year. */
const EVENTS: Place[] = [
  e('Monaco Grand Prix', 'Circuit de Monaco, Monte Carlo', 'usually May', 'f1, formula 1'),
  e('Abu Dhabi Grand Prix', 'Yas Marina Circuit, Abu Dhabi', 'usually December', 'f1, formula 1'),
  e('Las Vegas Grand Prix', 'Las Vegas Strip Circuit, Las Vegas', 'usually November', 'f1, formula 1'),
  e('British Grand Prix', 'Silverstone, England', 'usually July', 'f1, formula 1'),
  e('Singapore Grand Prix', 'Marina Bay, Singapore', 'usually autumn', 'f1, formula 1'),
  e('Miami Grand Prix', 'Miami International Autodrome, Miami', 'usually May', 'f1, formula 1'),
  e('Italian Grand Prix', 'Monza, Italy', 'usually September', 'f1, formula 1'),
  e('24 Hours of Le Mans', 'Circuit de la Sarthe, Le Mans', 'usually June', 'lemans, endurance'),
  e('Wimbledon', 'All England Club, London', 'usually July', 'tennis, centre court'),
  e('Roland-Garros', 'Stade Roland-Garros, Paris', 'usually May to June', 'french open, tennis'),
  e('US Open', 'Flushing Meadows, New York', 'usually late summer', 'tennis'),
  e('Australian Open', 'Melbourne Park, Melbourne', 'usually January', 'tennis'),
  e('Champions League Final', 'Venue changes each year', 'usually May or June', 'football, ucl, soccer'),
  e('Super Bowl', 'Venue changes each year', 'usually February', 'nfl, american football'),
  e('NBA Finals', 'Finalists’ home arenas', 'usually June', 'basketball'),
  e('The Masters', 'Augusta National, Georgia', 'usually April', 'golf'),
  e('Kentucky Derby', 'Churchill Downs, Louisville', 'usually May', 'horse racing'),
  e('Royal Ascot', 'Ascot Racecourse, England', 'usually June', 'horse racing'),
  e('Cheltenham Festival', 'Cheltenham Racecourse, England', 'usually March', 'horse racing'),
  e('Dubai World Cup', 'Meydan, Dubai', 'usually March', 'horse racing'),
  e('Goodwood Festival of Speed', 'Goodwood, England', 'usually July', 'cars'),
  e('Pebble Beach Concours', 'Pebble Beach, California', 'usually August', 'cars, monterey car week'),
  e('Monaco Yacht Show', 'Port Hercule, Monaco', 'usually September', 'yachts, boat show'),
  e('Cannes Film Festival', 'Palais des Festivals, Cannes', 'usually May', 'film'),
  e('Art Basel', 'Messe Basel, Basel', 'usually June', 'art fair'),
  e('Art Basel Miami Beach', 'Miami Beach Convention Center', 'usually December', 'art fair'),
  e('Art Basel Paris', 'Grand Palais, Paris', 'usually October', 'art fair'),
  e('Paris Fashion Week', 'Paris', 'usually spring and autumn', 'pfw, couture'),
  e('Milan Fashion Week', 'Milan', 'usually spring and autumn', 'mfw'),
  e('Salone del Mobile', 'Rho Fiera, Milan', 'usually April', 'design week'),
  e('Coachella', 'Empire Polo Club, Indio', 'usually April', 'festival, music'),
  e('Glastonbury', 'Worthy Farm, Somerset', 'usually June', 'festival, music'),
]

/** Wider regions, for requests that are about an experience more than an address. */
const REGIONS: Place[] = [
  r('Lapland', 'Finland and Sweden', 'aurora, northern lights, arctic'),
  r('Iceland', 'Iceland', 'aurora, northern lights, reykjavik'),
  r('Antarctica', 'Antarctica', 'expedition, polar'),
  r('Patagonia', 'Chile and Argentina', 'torres del paine'),
  r('Japan', 'Japan', 'ryokan'),
  r('Swiss Alps', 'Switzerland', 'ski, alps'),
  r('Kenya safari', 'Kenya', 'masai mara, laikipia'),
  r('Scottish Highlands', 'Scotland'),
  r('Amazon', 'Brazil and Peru', 'rainforest'),
  r('Bhutan', 'Bhutan'),
]

/**
 * What each category offers: the popular picks shown as one-click chips (in order),
 * then everything searched. Picks are names from that category's own list.
 */
type Catalogue = { featured: string[]; places: Place[] }

export type PlaceCategory = 'yachts' | 'villas' | 'cars' | 'dining' | 'events' | 'bespoke'

export const CATALOGUES: Record<PlaceCategory, Catalogue> = {
  villas: {
    featured: ['Mykonos', 'Ibiza', 'St Barths', 'Saint-Tropez', 'Lake Como', 'Tuscany', 'Courchevel', 'Amalfi Coast', 'Marbella', 'Maldives'],
    places: DESTINATIONS,
  },
  yachts: {
    featured: [
      'French Riviera',
      'Amalfi Coast',
      'Balearic Islands',
      'Sardinia and Corsica',
      'Croatia',
      'Greek Cyclades',
      'British Virgin Islands',
      'Bahamas',
      'St Barths and St Martin',
      'Maldives',
    ],
    places: CRUISING,
  },
  cars: {
    featured: ['Monaco', 'London', 'Dubai', 'Miami', 'Los Angeles', 'Paris', 'Milan', 'Geneva', 'Nice', 'Riyadh'],
    places: [...CITIES, ...DESTINATIONS],
  },
  dining: {
    featured: ['London', 'Paris', 'New York', 'Tokyo', 'Dubai', 'Monaco', 'Mykonos', 'Ibiza', 'Copenhagen', 'Hong Kong'],
    places: [...CITIES, ...DESTINATIONS],
  },
  events: {
    featured: [
      'Monaco Grand Prix',
      'Abu Dhabi Grand Prix',
      'Wimbledon',
      'Super Bowl',
      'Champions League Final',
      'Royal Ascot',
      'Art Basel Miami Beach',
      'Cannes Film Festival',
      'Paris Fashion Week',
      'Coachella',
    ],
    places: [...EVENTS, ...CITIES],
  },
  bespoke: {
    featured: ['Lapland', 'Iceland', 'Antarctica', 'Kenya safari', 'Japan', 'Patagonia', 'Paris', 'Swiss Alps', 'Maldives'],
    places: [...REGIONS, ...DESTINATIONS, ...CITIES],
  },
}

export function isPlaceCategory(slug: string): slug is PlaceCategory {
  return slug in CATALOGUES
}

/** The popular picks for a category, in display order. */
export function featuredPlaces(category: PlaceCategory): Place[] {
  const { featured, places } = CATALOGUES[category]
  return featured
    .map((name) => places.find((place) => place.name === name))
    .filter((place): place is Place => Boolean(place))
}

// --- search ------------------------------------------------------------------

type Indexed = {
  place: Place
  nName: string
  nArea: string
  nKeywords: string[]
  weight: number
  /** Position in the curated list, which is written most-booked first. Breaks ties. */
  rank: number
}

export type PlaceIndex = Indexed[]

function index(place: Place, weight: number, rank: number): Indexed {
  return {
    place,
    rank,
    nName: normalize(place.name),
    nArea: normalize(place.area),
    nKeywords: (place.keywords ?? '').split(',').map((keyword) => normalize(keyword)).filter(Boolean),
    weight,
  }
}

/**
 * Builds the search index for a category. World cities are optional: the curated
 * list works on its own, and the airport-derived cities are merged in once that
 * list has loaded. A world city already in the curated list is skipped.
 */
export function buildPlaceIndex(
  category: PlaceCategory,
  airports: Pick<Airport, 'city' | 'country' | 'size'>[] | null = null,
): PlaceIndex {
  const curated = CATALOGUES[category].places
  const out: Indexed[] = []
  const seen = new Set<string>()
  for (const place of curated) {
    const key = normalize(place.name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(index(place, 20, out.length))
  }

  if (airports) {
    // One entry per city and country, ranked by the biggest airport it has.
    const cities = new Map<string, { name: string; country: string; size: number }>()
    for (const { city, country, size } of airports) {
      if (!city) continue
      // "Leeds, West Yorkshire" reads as a city; keep the part before the comma.
      const name = city.split(',')[0].trim()
      const key = `${normalize(name)}|${country}`
      const existing = cities.get(key)
      if (!existing || size < existing.size) cities.set(key, { name, country, size })
    }
    for (const { name, country, size } of cities.values()) {
      if (seen.has(normalize(name))) continue
      out.push(index({ name, area: country, kind: 'city' }, -size * 6, Number.MAX_SAFE_INTEGER))
    }
  }
  return out
}

function wordStarts(haystack: string, needle: string): boolean {
  return haystack.split(/[\s,()/'-]+/).some((word) => word.startsWith(needle))
}

function score(entry: Indexed, q: string): number {
  if (entry.nName === q) return 100
  if (entry.nName.startsWith(q)) return 80
  if (entry.nKeywords.some((keyword) => keyword.startsWith(q))) return 70
  if (wordStarts(entry.nName, q)) return 60
  if (entry.nKeywords.some((keyword) => wordStarts(keyword, q))) return 50
  if (q.length >= 3 && entry.nArea.startsWith(q)) return 30
  if (q.length >= 3 && wordStarts(entry.nArea, q)) return 20
  // Several words, in any order: "grand prix", "lake como villa", "london mayfair".
  const words = q.split(/\s+/).filter(Boolean)
  if (words.length > 1) {
    const inName = words.every((word) => wordStarts(entry.nName, word))
    if (inName) return 65
    const anywhere = [entry.nName, entry.nArea, ...entry.nKeywords]
    if (words.every((word) => anywhere.some((text) => wordStarts(text, word)))) return 40
  }
  return 0
}

/** Best matches first; on a tie, curated order, then world cities alphabetically. */
export function searchPlaces(placeIndex: PlaceIndex, query: string, limit = 8): Place[] {
  const q = normalize(query)
  if (q.length < 2) return []
  const hits: { entry: Indexed; points: number }[] = []
  for (const entry of placeIndex) {
    const base = score(entry, q)
    if (base > 0) hits.push({ entry, points: base + entry.weight })
  }
  hits.sort(
    (a, b) => b.points - a.points || a.entry.rank - b.entry.rank || a.entry.place.name.localeCompare(b.entry.place.name),
  )
  return hits.slice(0, limit).map(({ entry }) => entry.place)
}

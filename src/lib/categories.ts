import type { CategorySlug } from './types'

export type CategoryField =
  | 'route'
  | 'location'
  | 'dates'
  | 'single_date'
  | 'party_size'

export type Category = {
  slug: CategorySlug
  name: string
  /** Sits under the tile title. One line, no filler. */
  tagline: string
  /** Opens the request page. Two sentences at most. */
  intro: string
  /** Honest expectation-setting, shown beside the form. */
  leadTime: string
  /** Typical spend band, in the operator's words. */
  typical: string
  fields: CategoryField[]
  /** Placeholder for the free-text box. Category-specific, never generic. */
  detailsPrompt: string
  /** Three things we always end up asking for. Shown as a checklist. */
  asks: [string, string, string]
  image: string
  imageAlt: string
}

export const CATEGORIES: Category[] = [
  {
    slug: 'jets',
    name: 'Private Aviation',
    tagline: 'Light jets to ultra long range, wheels up in hours',
    intro:
      'Tell us the route and the window. We come back with two or three aircraft, a clear all-in figure, and the crew story behind each one.',
    leadTime:
      'We aim to quote within 90 minutes during desk hours. Same-day departures are sometimes possible with four hours notice, subject to aircraft and crew availability.',
    typical: 'Light jet from $9,000 a leg. Heavy and ultra long range from $28,000. Indicative, varies by date and availability.',
    fields: ['route', 'dates', 'party_size'],
    detailsPrompt:
      'Departure window, luggage and any pets, cabin preferences, whether the aircraft should wait or reposition.',
    asks: ['Airports, not cities, if you know them', 'Passenger count and bag count', 'How firm the timing is'],
    image: '/media/jets.jpg',
    imageAlt: 'A private jet on the apron silhouetted against a low sun',
  },
  {
    slug: 'yachts',
    name: 'Yacht Charter',
    tagline: 'Crewed motor and sail, a week or a season',
    intro:
      'Give us the cruising ground and the dates. We shortlist boats that are genuinely available, with the crew and the running costs laid out plainly.',
    leadTime: 'Shortlists within a day. High-season Med weeks should be moved on months ahead.',
    typical: 'From $45,000 a week for a 24m. Above 40m, from $180,000 a week plus expenses. Indicative, varies by date and availability.',
    fields: ['location', 'dates', 'party_size'],
    detailsPrompt:
      'Cruising ground, cabin split, whether you need a chef, water toys, and anything the crew should know before you board.',
    asks: ['Embarkation port and route ideas', 'Guests sleeping aboard, not just aboard', 'Diet and access needs'],
    image: '/media/yachts.jpg',
    imageAlt: 'A superyacht moored in a harbour at golden hour',
  },
  {
    slug: 'villas',
    name: 'Villas & Estates',
    tagline: 'Staffed houses, private islands, ski chalets',
    intro:
      'Many of our houses are not on public listing sites. Send the dates and the shape of the group, and we send options with the staffing already costed.',
    leadTime: 'Options in a day. August in the Med and Christmas in the Alps close six months out.',
    typical: 'From $12,000 a week. Fully staffed trophy houses, $80,000 upward. Indicative, varies by date and availability.',
    fields: ['location', 'dates', 'party_size'],
    detailsPrompt:
      'Bedrooms and how you want them split, must-haves like a pool or gym, staffing level, dietary requirements.',
    asks: ['Region, then specific if you have it', 'Adults, children, and ages', 'Level of staffing you want'],
    image: '/media/villas.jpg',
    imageAlt: 'A lit villa and pool at night, palms against a dark sky',
  },
  {
    slug: 'cars',
    name: 'Supercars & Chauffeur',
    tagline: 'Self-drive exotics, armoured saloons, full security detail',
    intro:
      'Delivered to the hotel, the terminal, or the pit lane. Insurance, excess and cross-border terms are set by the rental company and confirmed before you take the keys.',
    leadTime: 'Confirmed in a few hours in most cities. Event weekends need two weeks.',
    typical: 'Self-drive from $1,400 a day. Chauffeur from $900 a day, security detail on request. Indicative, varies by date and availability.',
    fields: ['location', 'dates', 'party_size'],
    detailsPrompt:
      'First and second choice of car, transmission preference, delivery point and time, licence held and driver age.',
    asks: ['City and delivery address', 'Dates and daily mileage', 'Driver age and licence country'],
    image: '/media/cars.jpg',
    imageAlt: 'A black sports car on a road at night, headlights on',
  },
  {
    slug: 'dining',
    name: 'Tables & Private Chefs',
    tagline: 'The table that says it is fully booked',
    intro:
      'Counter seats, chef tables and rooms that do not take reservations from strangers. Or the chef comes to you.',
    leadTime: 'Most cities same day. The hardest thirty rooms in the world, two to six weeks.',
    typical: 'Table access from $400. Private chef from $1,500 plus provisioning. Indicative, varies by date and availability.',
    fields: ['location', 'single_date', 'party_size'],
    detailsPrompt:
      'Restaurant if you have one in mind, otherwise the mood you want. Time, allergies, and whether the occasion should be marked.',
    asks: ['City and neighbourhood', 'Date, and how flexible it is', 'Allergies and hard dislikes'],
    image: '/media/dining.jpg',
    imageAlt: 'A dark restaurant table set with wine glasses under low lamps',
  },
  {
    slug: 'events',
    name: 'Events & Access',
    tagline: 'Grand Prix, finals, fashion weeks, front row',
    intro:
      'When an event is sold out, we look for official hospitality and authorised resale, and we tell you where every ticket comes from. Tell us the event and the seats you actually want.',
    leadTime: 'Priced within a day. Prices move daily as an event approaches, in both directions.',
    typical: 'Hospitality from $2,500 a head. Finals and title fights, five figures a seat. Indicative, varies by date and availability.',
    fields: ['location', 'single_date', 'party_size'],
    detailsPrompt:
      'Event and session, where in the venue you want to be, hospitality or seats only, and your ceiling.',
    asks: ['Event and exact session or day', 'Seats together, or split acceptable', 'Your genuine ceiling'],
    image: '/media/events.jpg',
    imageAlt: 'A stadium pitch under floodlights at night',
  },
  {
    slug: 'bespoke',
    name: 'Bespoke',
    tagline: 'The request that does not fit a category',
    intro:
      'A closed museum after hours. A watchmaker who does not take commissions. Aurora forecasting with a photographer on standby. Describe it and we will tell you honestly whether it can be done.',
    leadTime: 'First response in a day, then an honest yes, no, or here is what is actually possible.',
    typical: 'Scoped per request. Under $10,000 we will usually point you somewhere better.',
    fields: ['location', 'dates', 'party_size'],
    detailsPrompt:
      'Describe what you want as if telling a friend. What matters most, what is negotiable, and what the day should feel like.',
    asks: ['Where in the world', 'Any fixed date, or a season', 'What would make it worth it'],
    image: '/media/bespoke.jpg',
    imageAlt: 'A marble staircase framed by dark panelled walls',
  },
]

export const CATEGORY_BY_SLUG: Record<CategorySlug, Category> = CATEGORIES.reduce(
  (acc, category) => {
    acc[category.slug] = category
    return acc
  },
  {} as Record<CategorySlug, Category>,
)

export function categoryName(slug: string): string {
  return CATEGORY_BY_SLUG[slug as CategorySlug]?.name ?? slug
}

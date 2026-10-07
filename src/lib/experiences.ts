/**
 * Solcierge Experiences: whole journeys the desk plans end to end, from the first
 * transfer to the last dinner. Each one is a starting shape, not a package. The
 * member requests it, and the desk quotes a version built around their dates, group
 * and taste, so nothing here carries a price or a fixed date.
 *
 * Seasons are written as "usually", never as exact dates, for the same reason as
 * event months in places.ts. Import-free so it is unit-tested directly.
 */

export const EXPERIENCE_SLUGS = [
  'big-five-safari',
  'cape-town',
  'great-migration-kenya',
  'gorilla-trekking-rwanda',
  'tokyo-kyoto',
  'bali-spiritual-retreat',
  'maldives-escape',
  'swiss-alps-skiing',
  'arctic-expedition',
] as const
export type ExperienceSlug = (typeof EXPERIENCE_SLUGS)[number]

/** For browsing on /experiences. Written as shown on the filter. */
export const EXPERIENCE_REGIONS = ['Africa', 'Asia', 'Snow and ice'] as const
export type ExperienceRegion = (typeof EXPERIENCE_REGIONS)[number]

export type ExperienceBeat = {
  /** A short label for where this falls in the trip. */
  when: string
  title: string
  body: string
}

export type Experience = {
  slug: ExperienceSlug
  name: string
  /** Country or region, shown as the eyebrow. */
  place: string
  region: ExperienceRegion
  /** One line under the title on cards. */
  tagline: string
  /** Opens the page. Two sentences at most. */
  intro: string
  /** Planned from our own doorstep in Cape Town. Shown as a small mark. */
  homeGround?: boolean
  duration: string
  season: string
  /** Where the member might base themselves. One-click picks on the form. */
  bases: string[]
  /** A sample shape for the trip. Rewritten around every member. */
  shape: ExperienceBeat[]
  /** What the desk arranges. Six lines, kept general: suppliers are named in the quote. */
  included: string[]
  /** Placeholder for the free-text brief. */
  briefPrompt: string
  image: string
  imageAlt: string
  /** CSS object-position that keeps the subject in frame when the hero is cropped. */
  focus: string
  /** A second photograph for the band between the itinerary and the brief. */
  image2: string
  image2Alt: string
}

export const EXPERIENCES: Experience[] = [
  {
    slug: 'big-five-safari',
    name: 'Big Five Safari',
    place: 'South Africa',
    region: 'Africa',
    tagline: 'Lion, leopard, elephant, buffalo and rhino, with a tracker of your own',
    intro:
      'Private reserves where the guide and tracker work only for your group, and the vehicle leaves when you are ready, not on a timetable. We plan this from Cape Town, so it is home ground.',
    homeGround: true,
    duration: 'Four to seven nights',
    season: 'Usually best May to October, when the bush thins and game gathers at water.',
    bases: ['Sabi Sand', 'Timbavati', 'Greater Kruger', 'Madikwe', 'Waterberg', 'Eastern Cape'],
    shape: [
      {
        when: 'Arrival',
        title: 'Wheels down on the reserve',
        body: 'A light aircraft from Johannesburg or Cape Town lands on the lodge airstrip. Lunch on the deck, then the first drive at four.',
      },
      {
        when: 'Every day',
        title: 'Dawn and dusk in the bush',
        body: 'Coffee by lamplight and out before sunrise, back for brunch. The afternoon is yours until the evening drive and a fire under the stars.',
      },
      {
        when: 'One morning',
        title: 'Tracking on foot',
        body: 'A walking safari with an armed ranger and a tracker, reading the ground for whatever passed in the night.',
      },
      {
        when: 'Something different',
        title: 'A sleep-out, a hide, a helicopter',
        body: 'A night on a raised deck in the open, a photographic hide at a waterhole, or a flight low over the reserve.',
      },
      {
        when: 'Onward',
        title: 'Cape Town or the coast',
        body: 'Most guests add a few days in the Cape. We join this to Experience Cape Town without a gap in between.',
      },
    ],
    included: [
      'A private vehicle, guide and tracker for your group',
      'Light aircraft or helicopter transfers',
      'Lodge suites or a private villa on the reserve, fully catered',
      'Walking safaris and photographic hides',
      'Conservation visits where the reserve allows them',
      'A connecting stay in Cape Town if you want one',
    ],
    briefPrompt:
      'Who is travelling and their ages, whether it is a first safari, any interest in photography or walking, and the animal you most want to see.',
    image: '/media/experiences/safari.jpg',
    imageAlt: 'A leopard drinking at a waterhole in low golden light',
    focus: '38% 55%',
    image2: '/media/experiences/safari-2.jpg',
    image2Alt: 'A thatched safari lodge and pool lit by lanterns at dusk',
  },
  {
    slug: 'cape-town',
    name: 'Experience Cape Town',
    place: 'South Africa',
    region: 'Africa',
    tagline: 'Mountain, ocean and winelands, opened up by people who live here',
    intro:
      'Our desk is in Cape Town, so this one is personal. The tables locals keep to themselves, cellars opened after hours, and the coast road at the right time of day.',
    homeGround: true,
    duration: 'Four to eight nights',
    season: 'Usually best November to April, the long dry summer. Winter brings whales to the coast and quiet roads.',
    bases: ['Camps Bay', 'Clifton', 'V&A Waterfront', 'Constantia', 'Franschhoek', 'Hermanus'],
    shape: [
      {
        when: 'Arrival',
        title: 'Met at the aircraft',
        body: 'Collected planeside, then twenty minutes to a villa above the Atlantic with the house staff already briefed.',
      },
      {
        when: 'Early',
        title: 'The mountain before the crowds',
        body: "Table Mountain or Lion's Head at first light with a private guide, or a helicopter along the Twelve Apostles.",
      },
      {
        when: 'A full day',
        title: 'Into the winelands',
        body: 'Franschhoek and Stellenbosch with a driver: private cellar tastings and a long lunch among the vines.',
      },
      {
        when: 'Another day',
        title: 'Around the peninsula',
        body: "Chapman's Peak, the penguins at Boulders, Cape Point, and a seafood lunch in Kalk Bay on the way home.",
      },
      {
        when: 'Evenings',
        title: 'Sundowners and the right table',
        body: 'A yacht off Clifton as the sun goes, then dinner at a kitchen the city keeps for its regulars.',
      },
    ],
    included: [
      'A villa or suite with the view, staffed if you want it',
      'A chauffeur and vehicle for the whole stay',
      'Private guides for the mountain, peninsula and winelands',
      'Helicopter and yacht time',
      'Restaurant tables and private tastings',
      'A safari add-on, joined without a gap',
    ],
    briefPrompt:
      'The pace you like, what you want from the food and wine, whether the ocean or the mountain matters more, and anyone who needs slower days.',
    image: '/media/experiences/cape-town.jpg',
    imageAlt: 'Camps Bay at dusk, the town lights below the Twelve Apostles and the Atlantic',
    focus: '62% 55%',
    image2: '/media/experiences/cape-town-2.jpg',
    image2Alt: 'The Twelve Apostles and Camps Bay from the air in warm evening light',
  },
  {
    slug: 'great-migration-kenya',
    name: 'Great Migration',
    place: 'Kenya',
    region: 'Africa',
    tagline: 'Over a million wildebeest, the Mara River, and a camp of your own',
    intro:
      'When the herds cross from the Serengeti into the Masai Mara, we put you in a private conservancy camp with a guide who knows which crossing point to sit at, and the patience to wait for it.',
    duration: 'Four to seven nights',
    season: 'Usually July to October, when the herds are in the Mara. River crossings never keep a timetable.',
    bases: ['Masai Mara', 'Mara North Conservancy', 'Olare Motorogi', 'Naboisho', 'Laikipia', 'Amboseli'],
    shape: [
      {
        when: 'Arrival',
        title: 'Nairobi, then a bush flight',
        body: 'Met at the aircraft in Nairobi and flown to an airstrip in the Mara, where your guide and vehicle are waiting.',
      },
      {
        when: 'Every day',
        title: 'Following the herds',
        body: 'Long days out with a private guide and vehicle, breakfast in the bush, and back to camp only when you choose.',
      },
      {
        when: 'When they commit',
        title: 'At the Mara River',
        body: 'Waiting at the crossing points for the herds to go, with crocodiles in the water and predators on the banks. The waiting is part of it.',
      },
      {
        when: 'One dawn',
        title: 'Over the plains by balloon',
        body: 'A hot air balloon at sunrise over the herds, then breakfast laid out wherever it comes down.',
      },
      {
        when: 'Onward',
        title: 'Laikipia, the coast, or the gorillas',
        body: 'Rhino and walking safaris in Laikipia, a few days on the beach at Lamu, or a short hop to Rwanda for the gorillas.',
      },
    ],
    included: [
      'A private conservancy camp, or a private house of your own',
      'Bush flights from Nairobi',
      'A private vehicle and guide for your group',
      'A balloon safari at dawn',
      'Maasai community and conservation visits',
      'A Laikipia, beach or gorilla extension',
    ],
    briefPrompt:
      'Who is travelling and their ages, whether it is a first safari, how much you care about seeing a river crossing, and what you would like to join it to.',
    image: '/media/experiences/great-migration.jpg',
    imageAlt: 'Wildebeest charging down a dusty bank towards the river',
    focus: '60% 50%',
    image2: '/media/experiences/great-migration-2.jpg',
    image2Alt: 'A lone acacia silhouetted against the setting sun on the plains',
  },
  {
    slug: 'gorilla-trekking-rwanda',
    name: 'Gorilla Trekking',
    place: 'Rwanda',
    region: 'Africa',
    tagline: 'An hour with a mountain gorilla family in the volcano forests',
    intro:
      'Gorillas live in Uganda and Congo too, but we plan this in Rwanda: the finest lodges, the shortest journey, and a helicopter from Kigali to the edge of Volcanoes National Park. The hour with the family is the same; everything around it is better.',
    duration: 'Three to five nights',
    season: 'Usually best June to September and December to February, the drier months. Permits are limited, so the earlier the better.',
    bases: ['Volcanoes National Park', 'Kigali', 'Lake Kivu', 'Nyungwe Forest', 'Akagera'],
    shape: [
      {
        when: 'Arrival',
        title: 'Kigali, then up to the volcanoes',
        body: 'A helicopter from Kigali to the foothills of the Virungas, or a scenic drive. Your lodge looks straight out at the volcanoes.',
      },
      {
        when: 'Trek day',
        title: 'An hour with the gorillas',
        body: 'Up at dawn for a briefing at park headquarters, then a trek through bamboo and forest with trackers to a habituated family. One hour, seven metres away.',
      },
      {
        when: 'The next day',
        title: 'Again, or something different',
        body: 'Many guests trek twice. Or track golden monkeys, or hike to the research camp where Dian Fossey worked.',
      },
      {
        when: 'In between',
        title: 'Recover',
        body: 'Massage at the lodge, and an afternoon with the community and conservation teams who protect the park.',
      },
      {
        when: 'Onward',
        title: 'Chimpanzees, savannah or the Mara',
        body: 'Chimpanzee tracking in Nyungwe, a Big Five safari in Akagera, or a short flight to Kenya for the Great Migration.',
      },
    ],
    included: [
      'Gorilla permits, secured well in advance',
      'Helicopter transfers from Kigali',
      'A luxury lodge facing the Virungas',
      'A private guide, and porters on every trek',
      'A second trek or golden monkey tracking',
      'Extensions to Nyungwe, Akagera or Kenya',
    ],
    briefPrompt:
      'Everyone trekking and their ages (the minimum is fifteen), fitness and any knee or back concerns, how many treks you want, and what you would like to join it to.',
    image: '/media/experiences/gorillas.jpg',
    imageAlt: 'A mountain gorilla looking up through forest leaves',
    focus: '30% 60%',
    image2: '/media/experiences/gorillas-2.jpg',
    image2Alt: 'Morning mist over forested hills at sunrise',
  },
  {
    slug: 'tokyo-kyoto',
    name: 'Tokyo & Kyoto',
    place: 'Japan',
    region: 'Asia',
    tagline: 'Counter seats, private temples, and the bullet train between them',
    intro:
      'The sushi counters that rarely take strangers, temple gardens opened before the crowds, and an evening with a geiko in Gion. Tokyo\u2019s energy, then Kyoto\u2019s quiet, with a guide who opens doors in both.',
    duration: 'Seven to twelve nights',
    season: 'Usually best late March to early April for the cherry blossom, and November for the autumn colour.',
    bases: ['Tokyo', 'Kyoto', 'Hakone', 'Osaka', 'Naoshima', 'Niseko'],
    shape: [
      {
        when: 'Arrival',
        title: 'Haneda, then the city',
        body: 'Met at the aircraft and driven into Tokyo, to a suite high above the city with the skyline laid out at night.',
      },
      {
        when: 'In Tokyo',
        title: 'The counters',
        body: 'Omakase at the counters that are hardest to book, and a cocktail bar of eight seats behind an unmarked door.',
      },
      {
        when: 'Between the cities',
        title: 'Hakone and the bullet train',
        body: 'A night at a ryokan with a private onsen and a kaiseki dinner, Mount Fuji on a clear morning, then the Green Car to Kyoto.',
      },
      {
        when: 'In Kyoto',
        title: 'Temples before the crowds',
        body: 'Gardens and temples opened early with a private guide, a tea ceremony, and an evening with a geiko and maiko in Gion.',
      },
      {
        when: 'Your way',
        title: 'Craft, art or powder',
        body: 'A knife maker or a lacquer studio, a day on the art island of Naoshima, or a few days of powder in Niseko in winter.',
      },
    ],
    included: [
      'Suites in Tokyo and Kyoto, and a ryokan night',
      'A private driver and bilingual guide throughout',
      'Reservations at the hardest counters',
      'Shinkansen and helicopter transfers',
      'A tea ceremony, a geiko evening and craft visits',
      'Extensions to Naoshima, Niseko or Osaka',
    ],
    briefPrompt:
      'What you love to eat and drink, the pace you like, whether you want tradition, design or nightlife, and any season you are set on.',
    image: '/media/experiences/japan.jpg',
    imageAlt: 'A five-storey pagoda in Kyoto lit gold against the night sky',
    focus: '45% 40%',
    image2: '/media/experiences/japan-2.jpg',
    image2Alt: 'Tokyo Tower lit orange above the city at night',
  },
  {
    slug: 'bali-spiritual-retreat',
    name: 'Bali Spiritual Retreat',
    place: 'Bali, Indonesia',
    region: 'Asia',
    tagline: 'Temples, ritual and stillness in the hills above Ubud',
    intro:
      'A retreat shaped around you rather than a group timetable: a priest or healer for blessing ceremonies, a teacher for daily practice, and a private villa in the jungle to come back to.',
    duration: 'Seven to fourteen nights',
    season: 'Usually best April to October, the dry season. Nyepi, the island’s day of silence, usually falls in March.',
    bases: ['Ubud', 'Sayan', 'Sidemen', 'Munduk', 'Uluwatu'],
    shape: [
      {
        when: 'Arrival',
        title: 'Slowly',
        body: 'Met at the aircraft in Denpasar, then a quiet drive up into the hills. Nothing planned for the first evening.',
      },
      {
        when: 'Every morning',
        title: 'Practice',
        body: 'Yoga, breathwork or meditation with a private teacher, at whatever level you arrive with.',
      },
      {
        when: 'Early in the stay',
        title: 'Water and blessing',
        body: 'A purification ritual at a spring temple, with a priest to guide you through each step.',
      },
      {
        when: 'Through the week',
        title: 'Sacred places',
        body: 'A mountain temple at dawn before the coaches, rice terraces on foot, and offerings made with a Balinese family.',
      },
      {
        when: 'In between',
        title: 'Restore',
        body: 'Balinese massage and healing, a plant-led kitchen, and days kept deliberately empty.',
      },
    ],
    included: [
      'A private villa or retreat residence',
      'A personal teacher and daily sessions',
      'Ceremonies with a local priest or healer',
      'A driver and guide for temple days',
      'A kitchen built around your diet',
      'Spa and bodywork in the villa',
    ],
    briefPrompt:
      'What you want to come home with, your practice or none at all, your diet, and how much solitude you want against company.',
    image: '/media/experiences/bali.jpg',
    imageAlt: 'The tiered meru towers of a Balinese temple against a dusk sky',
    focus: '32% 60%',
    image2: '/media/experiences/bali-2.jpg',
    image2Alt: 'Morning mist and low sun through the jungle canopy',
  },
  {
    slug: 'maldives-escape',
    name: 'Maldives Escape',
    place: 'Maldives',
    region: 'Asia',
    tagline: 'A seaplane, an atoll, and nothing at all to do',
    intro:
      'Over the water or on the sand, on a resort island or one entirely your own. We pick the atoll for the season, and the reef for what you want to see beneath it.',
    duration: 'Five to ten nights',
    season: 'Usually best November to April, the dry season. Manta and whale shark months vary by atoll.',
    bases: ['North Malé Atoll', 'Baa Atoll', 'Raa Atoll', 'South Ari Atoll', 'Laamu Atoll', 'A private island'],
    shape: [
      {
        when: 'Arrival',
        title: 'Seaplane from Malé',
        body: 'Met at the airport and walked through to the seaplane or yacht. Barefoot from then on.',
      },
      {
        when: 'Most mornings',
        title: 'The reef',
        body: 'Snorkel or dive with a marine biologist, on the house reef or a channel nobody else is on that day.',
      },
      {
        when: 'One day',
        title: 'On the water',
        body: 'A private yacht for the day, dolphins at sunset, and lunch on a sandbank set up before you arrive.',
      },
      {
        when: 'Evenings',
        title: 'Dinner wherever you like',
        body: 'On the beach under the stars, in your villa, or below the surface where the island has an underwater room.',
      },
      {
        when: 'In between',
        title: 'Rest',
        body: 'A spa over the lagoon and long days with nothing scheduled at all.',
      },
    ],
    included: [
      'An overwater or beach villa with a butler',
      'Seaplane or yacht transfers',
      'Private diving and snorkelling guides',
      'A yacht day and sandbank dining',
      'A spa programme',
      'Whole-island buyouts on request',
    ],
    briefPrompt:
      'Over the water or on the beach, diving or not, whether children are coming, and what you want the days to feel like.',
    image: '/media/experiences/maldives.jpg',
    imageAlt: 'An overwater pavilion lit on a still lagoon at dusk',
    focus: '74% 50%',
    image2: '/media/experiences/maldives-2.jpg',
    image2Alt: 'A lit beach villa under palms and the Milky Way at night',
  },
  {
    slug: 'swiss-alps-skiing',
    name: 'Swiss Alps Skiing',
    place: 'Switzerland',
    region: 'Snow and ice',
    tagline: 'A staffed chalet, a private guide and first tracks under the Matterhorn',
    intro:
      'A chalet with a chef and host in Zermatt, St. Moritz, Verbier or Gstaad, a guide who knows where the snow is, and a helicopter for the slopes the lifts do not reach.',
    duration: 'Five to ten nights',
    season: 'Usually best January to March. Christmas and February half-term weeks book out first.',
    bases: ['Zermatt', 'St. Moritz', 'Verbier', 'Gstaad', 'Andermatt', 'Crans-Montana'],
    shape: [
      {
        when: 'Arrival',
        title: 'Geneva or Zurich, then up',
        body: 'Met planeside, then a helicopter or chauffeur to the resort. Skis and boots are fitted in the chalet, not in a queue.',
      },
      {
        when: 'Every day',
        title: 'On the mountain',
        body: 'A private guide or instructor each day, matched to every level in the group.',
      },
      {
        when: 'When conditions allow',
        title: 'Heli-skiing',
        body: 'Glacier landings and off-piste descents with a certified mountain guide.',
      },
      {
        when: 'Midday',
        title: 'Long lunches',
        body: 'The mountain restaurants worth the detour, with a table held whatever the weather.',
      },
      {
        when: 'Evenings',
        title: 'Back at the chalet',
        body: 'The chef cooks, the cellar is stocked to your taste, and one night is a sleigh ride and fondue in the village.',
      },
    ],
    included: [
      'A staffed chalet with chef and host',
      'Transfers by helicopter or chauffeur',
      'A private ski guide or instructor',
      'Lift passes and equipment, fitted in the chalet',
      'Heli-skiing days with a mountain guide',
      'Ski school and childcare for children',
    ],
    briefPrompt:
      'The group and their ski levels, children and their ages, on piste or off, and the weeks you could do.',
    image: '/media/experiences/swiss-alps.jpg',
    imageAlt: 'The Matterhorn summit lit by the first sun under a dark blue sky',
    focus: '22% 35%',
    image2: '/media/experiences/swiss-alps-2.jpg',
    image2Alt: 'Zermatt village lit at night in a snowy valley',
  },
  {
    slug: 'arctic-expedition',
    name: 'Arctic Expedition',
    place: 'The High Arctic',
    region: 'Snow and ice',
    tagline: 'Pack ice, polar bears and the midnight sun',
    intro:
      'On a small expedition ship or a private yacht, with polar guides and naturalists who have done this for decades. In winter it becomes a hunt for the northern lights.',
    duration: 'Seven to sixteen nights',
    season: 'Usually June to August for the pack ice and the midnight sun. September to March for the aurora.',
    bases: ['Svalbard', 'East Greenland', 'West Greenland', 'Canadian High Arctic', 'Northern Norway', 'Finnish Lapland'],
    shape: [
      {
        when: 'Arrival',
        title: 'North to the ship',
        body: 'A charter from Oslo or Copenhagen, then aboard. Your suite, your expedition gear, and the safety briefing over dinner.',
      },
      {
        when: 'Most days',
        title: 'Into the ice',
        body: 'Zodiac landings, glacier fronts and walrus haul-outs, led by armed polar guides.',
      },
      {
        when: 'Whenever they appear',
        title: 'Wildlife',
        body: 'Polar bears on the pack ice, Arctic fox, whales in the fjords. Sightings are never promised, so the ship goes where the animals are.',
      },
      {
        when: 'Beyond the ship',
        title: 'Kayak, fly, stay',
        body: 'Paddling between icebergs, a helicopter over the ice cap, or a night at a remote station.',
      },
      {
        when: 'The winter version',
        title: 'The northern lights',
        body: 'Glass-roofed lodges in Lapland or Northern Norway, dog sleds by day, and an aurora forecaster on call at night.',
      },
    ],
    included: [
      'A suite on a small expedition ship, or a private charter',
      'Charter flights to the departure port',
      'Polar guides, naturalists and a photographer',
      'Expedition clothing, fitted before you go',
      'Zodiac, kayak and helicopter excursions',
      'An aurora version from September to March',
    ],
    briefPrompt:
      'Summer ice or winter aurora, cabin preferences, fitness and mobility, and what you most want to see.',
    image: '/media/experiences/arctic.jpg',
    imageAlt: 'An expedition ship beside a towering iceberg in still polar water',
    focus: '42% 55%',
    image2: '/media/experiences/arctic-2.jpg',
    image2Alt: 'The aurora over a snowfield under a starry sky',
  },
]

export const EXPERIENCE_BY_SLUG: Record<ExperienceSlug, Experience> = Object.fromEntries(
  EXPERIENCES.map((experience) => [experience.slug, experience]),
) as Record<ExperienceSlug, Experience>

export function isExperienceSlug(value: unknown): value is ExperienceSlug {
  return typeof value === 'string' && (EXPERIENCE_SLUGS as readonly string[]).includes(value)
}

export function experienceName(slug: string | undefined | null): string | null {
  return isExperienceSlug(slug) ? EXPERIENCE_BY_SLUG[slug].name : null
}

/** The experiences shown under this one: the next three, wrapping round. */
export function otherExperiences(slug: ExperienceSlug, count = 3): Experience[] {
  const start = EXPERIENCES.findIndex((experience) => experience.slug === slug)
  return Array.from({ length: Math.min(count, EXPERIENCES.length - 1) }, (_, i) =>
    EXPERIENCES[(start + 1 + i) % EXPERIENCES.length],
  )
}

/**
 * How many columns the last card should span so the bottom row of a grid is always
 * full: a lone card takes the whole row, and with two left in a row of three, the
 * second takes the remaining two. Every other card spans one.
 */
export function trailingSpan(count: number, columns: number): number {
  const left = count % columns
  return left === 0 ? 1 : columns - left + 1
}

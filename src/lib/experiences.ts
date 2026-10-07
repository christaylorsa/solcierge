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
  'namibia-dunes',
  'marrakech-atlas',
  'london-season',
  'scottish-highlands',
  'amalfi-coast',
  'cote-dazur',
  'swiss-alps-skiing',
  'arctic-expedition',
  'tokyo-kyoto',
  'hong-kong',
  'bali-spiritual-retreat',
  'maldives-escape',
  'bhutan',
  'dubai-desert',
  'new-york',
  'grand-canyon',
  'hawaiian-islands',
  'texas-ranch',
  'patagonia',
  'st-barths',
] as const
export type ExperienceSlug = (typeof EXPERIENCE_SLUGS)[number]

/** For browsing on /experiences. Written as shown on the filter. */
export const EXPERIENCE_REGIONS = ['Africa', 'Europe & UK', 'Asia', 'Americas'] as const
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
  /** One of the six shown on the home page. */
  featured?: boolean
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
    featured: true,
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
    slug: 'namibia-dunes',
    name: 'Namibia Dune Adventure',
    place: 'Namibia',
    region: 'Africa',
    tagline: 'The oldest desert on earth, by air, by buggy and on foot',
    intro:
      'The red dunes of Sossusvlei at first light, the Skeleton Coast from a light aircraft, and nights under some of the darkest skies on earth. A fly-in journey between remote desert lodges, a short flight from Cape Town.',
    duration: 'Five to nine nights',
    season: 'Usually best May to October: clear, cool days and cold desert nights.',
    bases: ['Sossusvlei', 'NamibRand', 'Skeleton Coast', 'Damaraland', 'Swakopmund', 'Etosha'],
    shape: [
      {
        when: 'Arrival',
        title: 'Straight into the desert',
        body: 'Met at the aircraft in Windhoek, or flown direct from Cape Town, then a light aircraft to a lodge on the edge of the dunes.',
      },
      {
        when: 'First light',
        title: 'Up the dunes before the heat',
        body: 'Climb the red dunes of Sossusvlei at sunrise, then walk down into Deadvlei among the dead camel thorn trees.',
      },
      {
        when: 'A full day',
        title: 'Over and across the sand',
        body: 'Quad bikes or dune buggies near Swakopmund, sandboarding, or a hot air balloon over the Namib at dawn.',
      },
      {
        when: 'From the air',
        title: 'The Skeleton Coast',
        body: 'A light aircraft along the coast where the dunes run into the Atlantic, past shipwrecks and seal colonies.',
      },
      {
        when: 'Every night',
        title: 'Under the darkest skies',
        body: 'Sleep out on a deck under the stars, with an astronomer to talk you through the southern sky.',
      },
    ],
    included: [
      'Light aircraft between every stop',
      'A private guide and vehicle throughout',
      'Remote desert lodges, fully catered',
      'Balloon, quad bike and sandboarding days',
      'Scenic flights over the dunes and the coast',
      'An extension to Etosha or Cape Town',
    ],
    briefPrompt:
      'How adventurous the group is, fitness for dune climbs, any interest in photography or flying, and whether you want wildlife at Etosha too.',
    image: '/media/experiences/namibia.jpg',
    imageAlt: 'The curved crest of a red dune, half in deep shadow, under a dark blue sky',
    focus: '66% 50%',
    image2: '/media/experiences/namibia-2.jpg',
    image2Alt: 'A dead camel thorn tree in Deadvlei under a starry sky',
  },
  {
    slug: 'marrakech-atlas',
    name: 'Marrakech & the Atlas',
    place: 'Morocco',
    region: 'Africa',
    tagline: 'Riads, mountain kasbahs and a camp under the Saharan stars',
    intro:
      'A private riad behind an unmarked door in the medina, a kasbah in the High Atlas, and a night in the Sahara with nothing between you and the stars. Three Moroccos, joined by road, by helicopter or by air.',
    duration: 'Five to ten nights',
    season: 'Usually best March to May and September to November, warm days and cool desert nights.',
    bases: ['Marrakech', 'Atlas Mountains', 'Agafay Desert', 'Sahara (Merzouga)', 'Fes', 'Essaouira'],
    shape: [
      {
        when: 'Arrival',
        title: 'Into the medina',
        body: 'Met at the aircraft in Marrakech and walked through the lanes to a riad of your own, with mint tea on the roof at dusk.',
      },
      {
        when: 'In the city',
        title: 'The souks with a guide',
        body: 'The souks, the Bahia Palace and the Majorelle garden with a private guide, then a hammam and dinner on a hidden terrace.',
      },
      {
        when: 'Into the mountains',
        title: 'A kasbah in the High Atlas',
        body: 'An hour south to a kasbah above the valleys: walks to Berber villages, lunch with a family, and snow on the peaks in spring.',
      },
      {
        when: 'The desert',
        title: 'A night in the Sahara',
        body: 'A light aircraft or a long drive to the dunes of Merzouga, a camel at sunset, and a lantern-lit camp under the stars.',
      },
      {
        when: 'Onward',
        title: 'Fes or the coast',
        body: 'The medieval medina of Fes, or a few slow days on the Atlantic at Essaouira before the flight home.',
      },
    ],
    included: [
      'A private riad, or suites in the medina',
      'A kasbah stay in the High Atlas',
      'A private desert camp in the Sahara',
      'A driver and private guide throughout',
      'Helicopter or light aircraft legs',
      'Hammam, cooking and craft visits',
    ],
    briefPrompt:
      'Who is travelling, how much of the city against the mountains and desert you want, comfort on long drives, and any dietary needs.',
    image: '/media/experiences/morocco.jpg',
    imageAlt: 'A desert camp lit by lanterns under a starry sky',
    focus: '50% 60%',
    image2: '/media/experiences/morocco-2.jpg',
    image2Alt: 'A riad courtyard with a plunge pool and palms',
  },
  {
    slug: 'london-season',
    name: 'The London Season',
    place: 'United Kingdom',
    region: 'Europe & UK',
    tagline: 'Ascot, Wimbledon, Glyndebourne, and a Mayfair suite between them',
    intro:
      'Early summer in England runs from one great occasion to the next. We handle the badges, the dress codes and the cars, and leave you the racing, the tennis and the long evenings.',
    duration: 'Five to ten nights',
    season: 'Usually May to July, when the Season runs back to back. Book Ascot and Wimbledon hospitality early.',
    bases: ['Mayfair', 'Knightsbridge', 'Chelsea', 'Notting Hill', 'Windsor', 'The Cotswolds'],
    shape: [
      {
        when: 'Arrival',
        title: 'Farnborough or Heathrow',
        body: 'Met planeside at a private terminal and driven into town, to a suite in Mayfair or a townhouse of your own.',
      },
      {
        when: 'Race day',
        title: 'Royal Ascot',
        body: 'Hospitality at Ascot with the dress code, badges and car handled, from the first race to the singing round the bandstand.',
      },
      {
        when: 'Centre Court',
        title: 'Wimbledon',
        body: 'Debenture or hospitality seats on the show courts, lunch in the grounds, and strawberries without the queue.',
      },
      {
        when: 'An evening',
        title: 'Opera in a garden',
        body: 'Glyndebourne in the Sussex countryside: black tie, a picnic laid on the lawns in the interval, and opera of the first rank.',
      },
      {
        when: 'In between',
        title: 'Savile Row and the country',
        body: 'A fitting on Savile Row, the Chelsea Flower Show in May, or a weekend at a country house in the Cotswolds.',
      },
    ],
    included: [
      'A Mayfair suite or a private townhouse',
      'A chauffeur for the whole stay',
      'Royal Ascot and Wimbledon hospitality',
      'Glyndebourne tickets and the picnic',
      'Restaurant tables and private members clubs',
      'A country house weekend',
    ],
    briefPrompt:
      'Which events matter most, the days you could do, how formal you want to be, and whether a weekend in the country appeals.',
    image: '/media/experiences/london.jpg',
    imageAlt: 'The Thames at night with lit bridges reflected in the water',
    focus: '55% 50%',
    image2: '/media/experiences/london-2.jpg',
    image2Alt: 'The City of London skyline under an orange evening sky',
  },
  {
    slug: 'scottish-highlands',
    name: 'Scottish Highlands',
    place: 'Scotland',
    region: 'Europe & UK',
    tagline: 'A castle of your own, a river to fish and a cask to taste',
    intro:
      'Exclusive use of a Highland castle or sporting estate, with a ghillie on the river, a stalker on the hill and a chef in the kitchen. Then the whisky country of Speyside and the wild light of Skye.',
    duration: 'Five to nine nights',
    season: 'Usually May to September for the long light. Autumn brings the colour and the stalking season.',
    bases: ['Speyside', 'Royal Deeside', 'Perthshire', 'Isle of Skye', 'Inverness', 'Edinburgh'],
    shape: [
      {
        when: 'Arrival',
        title: 'Edinburgh, then north',
        body: 'Met planeside in Edinburgh or Inverness, then a helicopter or a long road north to the estate. A piper at the door if you want one.',
      },
      {
        when: 'On the estate',
        title: 'River and hill',
        body: 'Salmon fishing with a ghillie, clay shooting, or a day on the hill with a stalker, back for a dram by the fire.',
      },
      {
        when: 'Speyside',
        title: 'The whisky country',
        body: 'Private tastings at distilleries that rarely open their doors, and the chance to taste from a single cask.',
      },
      {
        when: 'The west',
        title: 'Skye and the coast',
        body: 'The Old Man of Storr and the Quiraing, a boat to the islands, and seafood straight off the boats.',
      },
      {
        when: 'Evenings',
        title: 'Dinner in the great hall',
        body: 'The estate chef cooks what came off the hill and out of the river, and the cellar is opened to your taste.',
      },
    ],
    included: [
      'Exclusive use of a castle or sporting estate',
      'A chef, butler and estate staff',
      'Fishing, shooting and stalking with guides',
      'Private distillery visits and tastings',
      'Helicopter and chauffeur transfers',
      'A day or two on Skye',
    ],
    briefPrompt:
      'How many are coming and the bedrooms you need, which field sports appeal if any, the whisky lovers in the group, and the weeks you could do.',
    image: '/media/experiences/scotland.jpg',
    imageAlt: 'A floodlit Highland castle reflected in a dark loch',
    focus: '70% 55%',
    image2: '/media/experiences/scotland-2.jpg',
    image2Alt: 'The Old Man of Storr on Skye in low golden light',
  },
  {
    slug: 'amalfi-coast',
    name: 'Amalfi Coast',
    place: 'Italy',
    region: 'Europe & UK',
    tagline: 'Positano by night, Capri by boat, and lunch where the lemons grow',
    intro:
      'A villa or suite hung above the sea, a classic wooden boat of your own, and long lunches in the lemon groves. The coast at its best, without the coaches.',
    duration: 'Five to nine nights',
    season: 'Usually May to September. June and September are warm and quieter than August.',
    bases: ['Positano', 'Ravello', 'Amalfi', 'Capri', 'Sorrento', 'Praiano'],
    shape: [
      {
        when: 'Arrival',
        title: 'Naples, then the coast',
        body: 'Met at the aircraft in Naples and taken by helicopter or by sea to a villa above Positano or Ravello.',
      },
      {
        when: 'A full day',
        title: 'Capri by private boat',
        body: 'A classic wooden boat round the Faraglioni, a swim in the coves, and lunch at a beach club that only boats can reach.',
      },
      {
        when: 'Inland',
        title: 'Lemons and the hills',
        body: 'A cooking lesson in a lemon grove, a walk on the Path of the Gods, and concerts in the gardens of Ravello.',
      },
      {
        when: 'One morning',
        title: 'Pompeii before it opens',
        body: 'An archaeologist guides you through Pompeii early, before the crowds arrive with the heat.',
      },
      {
        when: 'Evenings',
        title: 'Positano by night',
        body: 'Dinner on a terrace above the lights, and a boat home along the coast.',
      },
    ],
    included: [
      'A villa or suite with a sea view',
      'A private boat and skipper',
      'Helicopter or sea transfers from Naples',
      'Private guides for Pompeii and the coast',
      'Cooking and lemon grove visits',
      'Restaurant and beach club reservations',
    ],
    briefPrompt:
      'Villa or hotel, how much time you want on the water, any must-have restaurants, and whether to add Capri or Rome.',
    image: '/media/experiences/amalfi.jpg',
    imageAlt: 'Positano lit at night, terraced down to the sea',
    focus: '45% 55%',
    image2: '/media/experiences/amalfi-2.jpg',
    image2Alt: 'Yachts lit at anchor on a dark sea',
  },
  {
    slug: 'cote-dazur',
    name: "Côte d'Azur & Monaco",
    place: 'France and Monaco',
    region: 'Europe & UK',
    tagline: 'A villa on the Cap, the Grand Prix, and the Riviera by water',
    intro:
      'A villa on Cap Ferrat or above Saint-Tropez, a day boat on standby, and Monaco a short drive along the corniche. In May, the Grand Prix from a terrace or a yacht in the harbour.',
    duration: 'Four to nine nights',
    season: 'Usually May to September. Grand Prix weekend is usually late May, and books out first.',
    bases: ['Saint-Jean-Cap-Ferrat', 'Monaco', 'Antibes', 'Cannes', 'Saint-Tropez', 'Èze'],
    shape: [
      {
        when: 'Arrival',
        title: 'Nice, then the Cap',
        body: 'Met planeside in Nice and taken by helicopter or car to a villa on the Cap, with the staff and the boat ready.',
      },
      {
        when: 'Grand Prix weekend',
        title: 'Monaco from the best seat',
        body: 'Hospitality on a terrace above the circuit, or a yacht in the harbour, with qualifying and race day handled.',
      },
      {
        when: 'On the water',
        title: 'The Riviera by boat',
        body: 'A day boat to the Îles de Lérins, lunch at a beach club in Saint-Tropez, and back before the evening breeze.',
      },
      {
        when: 'Inland',
        title: 'Perfume and hill villages',
        body: 'Create a scent with a perfumer in Grasse, then lunch in Saint-Paul-de-Vence or Èze above the sea.',
      },
      {
        when: 'Evenings',
        title: 'Monte Carlo at night',
        body: 'Dinner on the Place du Casino, and a table held at the clubs if the night runs on.',
      },
    ],
    included: [
      'A staffed villa or a suite on the Cap',
      'A day boat and skipper',
      'Grand Prix hospitality in season',
      'Helicopter and chauffeur transfers',
      'A perfumer session in Grasse',
      'Restaurant, beach club and nightlife tables',
    ],
    briefPrompt:
      'Grand Prix or not, villa or hotel, the size of boat you want, and the pace you like between lunches.',
    image: '/media/experiences/riviera.jpg',
    imageAlt: 'Monaco harbour and the city lit gold at night',
    focus: '50% 55%',
    image2: '/media/experiences/riviera-2.jpg',
    image2Alt: 'Yachts in a Riviera marina under a violet dusk sky',
  },
  {
    slug: 'swiss-alps-skiing',
    name: 'Swiss Alps Skiing',
    place: 'Switzerland',
    region: 'Europe & UK',
    featured: true,
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
    place: 'Norway and the High Arctic',
    region: 'Europe & UK',
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
  {
    slug: 'tokyo-kyoto',
    name: 'Tokyo & Kyoto',
    place: 'Japan',
    region: 'Asia',
    featured: true,
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
    slug: 'hong-kong',
    name: 'Experience Hong Kong',
    place: 'Hong Kong',
    region: 'Asia',
    tagline: 'A harbour-view suite, a junk to the islands, and the city by night',
    intro:
      'A suite above Victoria Harbour, dim sum at counters that open before dawn, and a junk boat to the outlying islands. A tailor in the morning, Michelin stars at night, and Macau across the water.',
    duration: 'Three to six nights',
    season: 'Usually best October to December, clear and cool. Spring is pleasant before the summer heat.',
    bases: ['Central', 'Tsim Sha Tsui', 'The Peak', 'Repulse Bay', 'Sai Kung', 'Macau'],
    shape: [
      {
        when: 'Arrival',
        title: 'Met on the apron',
        body: 'Collected planeside and driven, or flown by helicopter, to a suite with the harbour laid out below it.',
      },
      {
        when: 'Morning',
        title: 'Dim sum and the tailor',
        body: 'An early dim sum breakfast, then a fitting with a Hong Kong tailor, the suit delivered before you leave.',
      },
      {
        when: 'On the water',
        title: 'A junk to the islands',
        body: 'A private junk to Lamma or Sai Kung, with swimming in the bays and seafood on the quay.',
      },
      {
        when: 'Above the city',
        title: 'The Peak at dusk',
        body: 'The Peak as the lights come on, then the harbour from the water at night.',
      },
      {
        when: 'Across the water',
        title: 'Macau and the tables',
        body: 'A day across the water in Macau: Portuguese lanes, a long lunch, and the tables if you want them.',
      },
    ],
    included: [
      'A harbour-view suite',
      'A chauffeur and private guide',
      'A private junk for a day',
      'Reservations at the best counters and dining rooms',
      'A tailoring appointment',
      'Helicopter transfers and a day in Macau',
    ],
    briefPrompt:
      'What you love to eat, how much shopping and tailoring you want, the pace you like, and whether to join it to Tokyo or Bali.',
    image: '/media/experiences/hong-kong.jpg',
    imageAlt: 'A red-sailed junk crossing Victoria Harbour beneath the lit skyline',
    focus: '50% 55%',
    image2: '/media/experiences/hong-kong-2.jpg',
    image2Alt: 'The Hong Kong skyline from the Peak at dusk',
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
    featured: true,
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
    slug: 'bhutan',
    name: 'Bhutan',
    place: 'Bhutan',
    region: 'Asia',
    tagline: "Tiger's Nest, mountain dzongs and the last Himalayan kingdom",
    intro:
      'A circuit of quiet lodges through the valleys of Paro, Thimphu, Punakha and Gangtey, with a guide from the valley you are in. The country limits visitors deliberately, and it shows.',
    duration: 'Six to ten nights',
    season: 'Usually best March to May and September to November. Festival dates follow the lunar calendar.',
    bases: ['Paro', 'Thimphu', 'Punakha', 'Gangtey', 'Bumthang'],
    shape: [
      {
        when: 'Arrival',
        title: 'Into Paro',
        body: 'One of the most dramatic approaches in the world, between the mountains into Paro, met by your guide and driver.',
      },
      {
        when: 'Early on',
        title: "The climb to Tiger's Nest",
        body: "A morning hike, or the first part on horseback, to the monastery on the cliff, with time inside before the day's visitors.",
      },
      {
        when: 'The valleys',
        title: 'Dzongs and monasteries',
        body: "Thimphu's craft schools, the Punakha Dzong where the rivers meet, and a blessing from a monk if you would like one.",
      },
      {
        when: 'Slowing down',
        title: 'Gangtey and the cranes',
        body: 'A glacial valley where black-necked cranes winter, a farmhouse lunch, and a hot stone bath in the evening.',
      },
      {
        when: 'If timing allows',
        title: 'A festival',
        body: 'A tsechu, with masked dances in a dzong courtyard. We plan around the lunar calendar if you want to see one.',
      },
    ],
    included: [
      'A circuit of luxury lodges',
      'Visa and sustainable development fee, arranged',
      'A licensed guide and private driver',
      'Monastery visits and blessings',
      'Hot stone baths and farmhouse meals',
      'Flights in and out of Paro',
    ],
    briefPrompt:
      'Fitness for the Tiger’s Nest climb, interest in Buddhism or festivals, how many valleys you want to see, and where you will fly in from.',
    image: '/media/experiences/bhutan.jpg',
    imageAlt: "Tiger's Nest monastery on its cliff above the forest",
    focus: '30% 50%',
    image2: '/media/experiences/bhutan-2.jpg',
    image2Alt: 'Mist rolling over a forested mountainside',
  },
  {
    slug: 'dubai-desert',
    name: 'Dubai & the Desert',
    place: 'United Arab Emirates',
    region: 'Asia',
    tagline: 'A tower suite, a desert resort, and falcons at dawn',
    intro:
      'The city at its most extravagant, then an hour into the dunes for a desert resort, falconry at sunrise and dinner under the stars. Abu Dhabi and the Empty Quarter if you want to go further.',
    duration: 'Four to eight nights',
    season: 'Usually best November to March, warm days and cool desert nights.',
    bases: ['Downtown Dubai', 'Palm Jumeirah', 'Dubai Desert', 'Abu Dhabi', 'Liwa', 'Ras Al Khaimah'],
    shape: [
      {
        when: 'Arrival',
        title: 'A tower suite',
        body: 'Met planeside and driven to a suite high above the city, with the Burj Khalifa outside the window.',
      },
      {
        when: 'In the city',
        title: 'Dubai at full volume',
        body: 'A private yacht along the Palm, the souks of old Dubai by abra, and a chef’s table at night.',
      },
      {
        when: 'Into the dunes',
        title: 'A desert resort',
        body: 'An hour from the city to a resort in the dunes, with your own pool and nothing on the horizon.',
      },
      {
        when: 'Dawn',
        title: 'Falcons and camels',
        body: 'Falconry at sunrise, a camel trek over the dunes, or a vintage Land Rover drive with a guide.',
      },
      {
        when: 'Further',
        title: 'Abu Dhabi and the Empty Quarter',
        body: 'The Louvre Abu Dhabi and the Grand Mosque, then the great dunes of Liwa at the edge of the Empty Quarter.',
      },
    ],
    included: [
      'A tower suite and a desert resort',
      'A chauffeur and private guide',
      'A private yacht for an afternoon',
      'Falconry, camel and desert drives',
      'Restaurant tables and private dining in the dunes',
      'An Abu Dhabi or Liwa extension',
    ],
    briefPrompt:
      'City against desert, the group and their ages, any events or shopping you want in, and whether to add Abu Dhabi.',
    image: '/media/experiences/dubai.jpg',
    imageAlt: 'The Dubai skyline lit at night above the water',
    focus: '50% 50%',
    image2: '/media/experiences/dubai-2.jpg',
    image2Alt: 'A camel and rider silhouetted on a dune against the setting sun',
  },
  {
    slug: 'new-york',
    name: 'New York',
    place: 'United States',
    region: 'Americas',
    featured: true,
    tagline: 'The best seats in the house, all over the city that has every house',
    intro:
      'A suite over Central Park, house seats on Broadway, and the tables New York keeps for itself. Museums after hours where they allow it, a helicopter round Manhattan, and the Hamptons if you want the beach.',
    duration: 'Three to seven nights',
    season: 'Usually best April to June and September to December. The US Open is usually late August.',
    bases: ['Upper East Side', 'Midtown', 'SoHo', 'Tribeca', 'Brooklyn', 'The Hamptons'],
    shape: [
      {
        when: 'Arrival',
        title: 'Teterboro, then the park',
        body: 'Met planeside at Teterboro and driven into Manhattan, to a suite above Central Park.',
      },
      {
        when: 'Evenings',
        title: 'Broadway and the counters',
        body: 'House seats for the show everyone is talking about, then dinner at a counter that is booked for months.',
      },
      {
        when: 'A morning',
        title: 'The museums, quietly',
        body: 'The Met or MoMA with a curator-level guide, early or after hours where the museum allows it.',
      },
      {
        when: 'From the air',
        title: 'Manhattan by helicopter',
        body: 'A private helicopter round the island and the Statue of Liberty, back in time for lunch.',
      },
      {
        when: 'Weekend',
        title: 'Out to the Hamptons',
        body: 'A seaplane or helicopter to the Hamptons for a beach house weekend, or the US Open in late summer.',
      },
    ],
    included: [
      'A suite on the park or a private apartment',
      'A chauffeur for the whole stay',
      'Broadway house seats and premium tickets',
      'Reservations at the hardest tables',
      'Private museum and gallery visits',
      'Helicopter time and a Hamptons weekend',
    ],
    briefPrompt:
      'What you want from the city, food, shows, art, shopping or sport, the dates, and where you like to stay.',
    image: '/media/experiences/new-york.jpg',
    imageAlt: 'The Empire State Building lit against a black night sky',
    focus: '30% 50%',
    image2: '/media/experiences/new-york-2.jpg',
    image2Alt: 'Manhattan from the air at night',
  },
  {
    slug: 'grand-canyon',
    name: 'Grand Canyon & the Southwest',
    place: 'United States',
    region: 'Americas',
    tagline: 'Down into the canyon by helicopter, and the desert to yourself',
    intro:
      'A desert resort in the red rock country, a helicopter down into the Grand Canyon, and slot canyons glowing at midday. Then Lake Powell by boat and Monument Valley with a Navajo guide.',
    duration: 'Four to eight nights',
    season: 'Usually best March to May and September to October. Summer is hot; winter brings snow to the rim.',
    bases: ['Grand Canyon', 'Southern Utah', 'Lake Powell', 'Sedona', 'Scottsdale', 'Las Vegas'],
    shape: [
      {
        when: 'Arrival',
        title: 'Straight to the desert',
        body: 'Fly private into Page, Sedona or Las Vegas, then on to a desert resort set into the red rock.',
      },
      {
        when: 'The big day',
        title: 'Into the Grand Canyon',
        body: 'A helicopter down below the rim, landing on Hualapai land for lunch by the Colorado River.',
      },
      {
        when: 'Midday',
        title: 'Antelope Canyon',
        body: 'The slot canyons at the hour the light falls straight in, with a Navajo guide and no crowd.',
      },
      {
        when: 'On the water',
        title: 'Lake Powell',
        body: 'A private boat across Lake Powell to Rainbow Bridge, and a swim in the coves.',
      },
      {
        when: 'Sunset',
        title: 'Monument Valley',
        body: 'The buttes at sunset with a Navajo guide, then a night of stars far from any city.',
      },
    ],
    included: [
      'A desert resort or a private house',
      'Private aircraft and helicopter time',
      'A canyon landing and riverside lunch',
      'Navajo-guided slot canyon and valley tours',
      'A private boat on Lake Powell',
      'A Las Vegas or Sedona extension',
    ],
    briefPrompt:
      'How adventurous the group is, comfort with small aircraft, hiking against touring, and whether to start or finish in Las Vegas.',
    image: '/media/experiences/grand-canyon.jpg',
    imageAlt: 'The Grand Canyon at sunset, the last light on the rim',
    focus: '60% 55%',
    image2: '/media/experiences/grand-canyon-2.jpg',
    image2Alt: 'Light falling into a sandstone slot canyon',
  },
  {
    slug: 'hawaiian-islands',
    name: 'Hawaiian Islands',
    place: 'Hawaii',
    region: 'Americas',
    tagline: 'Volcanoes, sea cliffs and an island hop by private plane',
    intro:
      'Two or three islands, each for what it does best: the Nā Pali cliffs of Kauai, the volcanoes of the Big Island, and the beaches of Maui or Lāna‘i. Joined by private plane, with a house or resort on each.',
    duration: 'Seven to twelve nights',
    season: 'Usually good all year round. December to April brings humpback whales off Maui.',
    bases: ['Maui', 'Kauai', 'Big Island', 'Lanai', 'Oahu'],
    shape: [
      {
        when: 'Arrival',
        title: 'Straight to the islands',
        body: 'Met planeside in Honolulu or Maui and taken on to your first island by private plane.',
      },
      {
        when: 'Kauai',
        title: 'The Nā Pali Coast',
        body: 'The sea cliffs by helicopter, doors off if you dare, or by boat with dolphins at the bow.',
      },
      {
        when: 'Big Island',
        title: 'Volcanoes',
        body: 'Hawaiʻi Volcanoes National Park with a geologist, and lava glowing at night when the volcano is active.',
      },
      {
        when: 'Maui',
        title: 'Sunrise above the clouds',
        body: 'Sunrise from the summit of Haleakalā, the road to Hāna, and whales off the coast in winter.',
      },
      {
        when: 'Evenings',
        title: 'Manta rays and a private luau',
        body: 'A night snorkel with manta rays off Kona, and a private luau on the beach.',
      },
    ],
    included: [
      'A resort or private house on each island',
      'Private inter-island flights',
      'Helicopter and boat days',
      'Guides for the volcanoes and the summit',
      'Snorkelling, diving and whale watching',
      'A private luau',
    ],
    briefPrompt:
      'Which islands appeal, adventure against rest, children and their ages, and the time of year you are thinking about.',
    image: '/media/experiences/hawaii.jpg',
    imageAlt: 'Lava pouring into the Pacific from a dark volcanic shore',
    focus: '40% 55%',
    image2: '/media/experiences/hawaii-2.jpg',
    image2Alt: 'The Nā Pali sea cliffs of Kauai from the air',
  },
  {
    slug: 'texas-ranch',
    name: 'Texas Ranch Country',
    place: 'United States',
    region: 'Americas',
    tagline: 'A private ranch, the Hill Country and the big skies of the west',
    intro:
      'A working ranch of your own in the Hill Country, with horses, a pitmaster and live music in Austin an hour away. Then west to Marfa and Big Bend, where the sky is bigger than anywhere.',
    duration: 'Four to eight nights',
    season: 'Usually best March to May for the wildflowers, and October to November.',
    bases: ['Hill Country', 'Austin', 'San Antonio', 'Marfa', 'Big Bend', 'Dallas'],
    shape: [
      {
        when: 'Arrival',
        title: 'Austin, then the ranch',
        body: 'Met planeside in Austin and driven, or flown, out to a private ranch in the Hill Country.',
      },
      {
        when: 'On the ranch',
        title: 'Horses and the open range',
        body: 'Riding out with the wranglers, a cattle drive if you want to work, and swimming in the river.',
      },
      {
        when: 'Supper',
        title: 'The pitmaster',
        body: 'A pitmaster cooks brisket low and slow on the ranch, and a band plays under the oaks.',
      },
      {
        when: 'In town',
        title: 'Austin at night',
        body: 'The live music city, with the best rooms on the night and the tables that go with them.',
      },
      {
        when: 'West',
        title: 'Marfa and Big Bend',
        body: 'A private plane to the art town of Marfa, then Big Bend at sunset and some of the darkest skies in America.',
      },
    ],
    included: [
      'A private ranch with staff',
      'Riding, ranch work and river days',
      'A pitmaster and live music on the ranch',
      'A chauffeur and Austin nights',
      'Private flights west to Marfa',
      'A Big Bend guide and stargazing',
    ],
    briefPrompt:
      'Riding experience in the group, ranch against city time, music and food you love, and whether to go west to Big Bend.',
    image: '/media/experiences/texas.jpg',
    imageAlt: 'Cattle grazing on a ranch at sunset',
    focus: '50% 60%',
    image2: '/media/experiences/texas-2.jpg',
    image2Alt: 'The mesas of Big Bend in low evening light',
  },
  {
    slug: 'patagonia',
    name: 'Patagonia',
    place: 'Chile and Argentina',
    region: 'Americas',
    featured: true,
    tagline: 'Granite towers, a calving glacier and an estancia at the end of the earth',
    intro:
      'The towers of Torres del Paine from a lodge with the view in every window, and the Perito Moreno glacier across the border in Argentina. Wind, wide skies and gauchos, with a private plane between them.',
    duration: 'Six to ten nights',
    season: 'Usually October to April, the southern spring and summer. The wind is part of it.',
    bases: ['Torres del Paine', 'Puerto Natales', 'El Calafate', 'El Chaltén', 'Tierra del Fuego', 'Bariloche'],
    shape: [
      {
        when: 'Arrival',
        title: 'Santiago, then south',
        body: 'A private flight down the length of Chile to Punta Arenas or Puerto Natales, and on to the lodge.',
      },
      {
        when: 'Torres del Paine',
        title: 'The towers at dawn',
        body: 'The hike to the base of the towers for first light, or easier walks to lakes and waterfalls with your guide.',
      },
      {
        when: 'On horseback',
        title: 'With the gauchos',
        body: 'Riding the steppe with gauchos, and a lamb roasted over the fire at an estancia.',
      },
      {
        when: 'Across the border',
        title: 'Perito Moreno',
        body: 'The glacier from the walkways and the water, and a walk on the ice in crampons.',
      },
      {
        when: 'Further',
        title: 'Fitz Roy or the end of the world',
        body: 'El Chaltén under Fitz Roy, or on to Tierra del Fuego and the Beagle Channel.',
      },
    ],
    included: [
      'Lodges with the view, fully catered',
      'Private flights and cross-border transfers',
      'Private guides for every hike',
      'Riding and an estancia lunch',
      'A boat to the glacier and an ice walk',
      'A Fitz Roy or Tierra del Fuego extension',
    ],
    briefPrompt:
      'Fitness and how much hiking you want, Chile only or both sides, riding experience, and the months you are looking at.',
    image: '/media/experiences/patagonia.jpg',
    imageAlt: 'The granite towers of Torres del Paine lit by the first sun',
    focus: '45% 45%',
    image2: '/media/experiences/patagonia-2.jpg',
    image2Alt: 'The Perito Moreno glacier meeting a turquoise lake',
  },
  {
    slug: 'st-barths',
    name: 'St Barths',
    place: 'Caribbean',
    region: 'Americas',
    tagline: 'A villa above the bay, a yacht on standby and long lunches on the sand',
    intro:
      'The smallest, most polished island in the Caribbean: a hillside villa with the staff already in, a yacht for day trips to Anguilla and St Martin, and lunch that runs until sunset.',
    duration: 'Five to ten nights',
    season: 'Usually December to April. The weeks around New Year book out first.',
    bases: ['Gustavia', 'St Jean', 'Flamands', 'Lorient', 'Toiny', 'Grand Cul-de-Sac'],
    shape: [
      {
        when: 'Arrival',
        title: 'The short runway',
        body: 'A private jet to St Martin, then a short hop onto the famous runway at St Barths, a car waiting.',
      },
      {
        when: 'Every day',
        title: 'Villa life',
        body: 'A villa above the bay, a chef for breakfast and dinner, and nowhere you have to be.',
      },
      {
        when: 'On the water',
        title: 'A yacht day',
        body: 'Over to Anguilla for its beaches, or to a quiet cove for snorkelling with turtles.',
      },
      {
        when: 'Lunch',
        title: 'Long lunches on the sand',
        body: 'The beach restaurants that make the island, with the tables held and the afternoon cleared.',
      },
      {
        when: 'New Year',
        title: 'The harbour at its peak',
        body: 'New Year in Gustavia, with the yachts lit in the harbour and a table at the party of the night.',
      },
    ],
    included: [
      'A staffed villa with a chef',
      'Private jet and island hop transfers',
      'A yacht and crew for day trips',
      'A car for the stay',
      'Restaurant and beach club reservations',
      'New Year tables in season',
    ],
    briefPrompt:
      'How many bedrooms, the dates (New Year is the tightest), how much time on the water, and the pace you like.',
    image: '/media/experiences/st-barths.jpg',
    imageAlt: 'A shaded beach restaurant opening onto the sea',
    focus: '50% 55%',
    image2: '/media/experiences/st-barths-2.jpg',
    image2Alt: 'A yacht crossing turquoise water from above',
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

/**
 * The experiences shown under this one: the next three in its own region, wrapping
 * round, then the rest of the list if the region is too small.
 */
export function otherExperiences(slug: ExperienceSlug, count = 3): Experience[] {
  const self = EXPERIENCE_BY_SLUG[slug]
  const region = EXPERIENCES.filter((experience) => experience.region === self.region)
  const at = region.indexOf(self)
  const near = [...region.slice(at + 1), ...region.slice(0, at)]
  const far = EXPERIENCES.filter((experience) => experience.region !== self.region)
  return [...near, ...far].slice(0, count)
}

/** The experiences in a region, in list order. */
export function experiencesIn(region: ExperienceRegion): Experience[] {
  return EXPERIENCES.filter((experience) => experience.region === region)
}

/** The six on the home page. */
export const FEATURED_EXPERIENCES = EXPERIENCES.filter((experience) => experience.featured)

/**
 * How many columns the last card should span so the bottom row of a grid is always
 * full: a lone card takes the whole row, and with two left in a row of three, the
 * second takes the remaining two. Every other card spans one.
 */
export function trailingSpan(count: number, columns: number): number {
  const left = count % columns
  return left === 0 ? 1 : columns - left + 1
}

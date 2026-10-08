// Gals are budding yeasts with clustered daughters; molds coming next.
//
// `zone`: inhibition diameter (mm), scaled by ZONE_*; null = resistant.
// Candi: CLSI M44 approximations. Sasha/Olive: efficacy estimates.
//
// `antifungals`: disks in level order, with standard codes.
// `scientific`: species above dish; gal's name uses her `color`.
// Italics throughout unless *asterisks* mark specific parts.
// `colors`: daughter-cell colors.
// `facts`: random win/lose pop-up facts (game/facts.js); *names* italicize.
export const SPECIES = {
  sasha: {
    facts: [
      "Sasha's genus name, Saccharomyces, means \"sugar fungus.\"",
      "Sasha makes bread rise: the carbon dioxide she gives off puffs the dough up with bubbles.",
      "Sasha turns sugar into alcohol and carbon dioxide, which is how beer and wine are made.",
      "Sasha reproduces by budding: a small daughter swells out of her side and pinches off.",
      "Each time Sasha buds, she gets a ring-shaped bud scar, so you can count her daughters.",
      "In 1996, Sasha became the first eukaryote to have her whole genome sequenced.",
      "Unlike bacteria, Sasha keeps her DNA in a nucleus, just like your cells do.",
      "Fungi like Sasha are more closely related to animals than to plants.",
      "In the 1850s, Louis Pasteur showed that living yeast like Sasha causes fermentation.",
      "Scientists study Sasha to learn how cell division, aging and DNA repair work in us.",
      "Sasha's cell wall has a little chitin in it, the same tough stuff as insect shells.",
      "Sasha can live with one set of chromosomes (haploid) or two (diploid).",
      "Sasha makes alcohol from sugar even with oxygen around, called the Crabtree effect.",
      "Engineered cells of Sasha's species help make insulin for people with diabetes.",
    ],
    scientific: 'Saccharomyces cerevisiae',
    color: '#8a5a2b', // for her name above the dish
    kind: 'yeast',
    colors: { fill: '#f3dfbf', stroke: '#8a5a2b', highlight: '#fbf3e4', dark: '#5b3a1e' },
    antifungals: [
      { code: 'AMB', name: 'amphotericin B', zone: 17 },
      { code: 'NY', name: 'nystatin', zone: 20 },
      { code: 'VOR', name: 'voriconazole', zone: 25 },
      { code: 'CAS', name: 'caspofungin', zone: 20 },
      { code: 'FLC', name: 'fluconazole', zone: 15 },
    ],
  },
  candi: {
    facts: [
      "Candi lives harmlessly in the mouth, gut and skin of most people.",
      "Candi can switch shapes: round budding yeast cells or long threads called hyphae.",
      "Switching to hyphae helps Candi push into tissue, part of how she causes disease.",
      "Candi causes thrush, white patches inside the mouth.",
      "Candi is the most common cause of yeast infections.",
      "Candi's genus, *Candida*, comes from candidus, Latin for white, like her creamy colonies.",
      "In serum at body temperature, Candi sprouts germ tubes within hours, a classic lab test.",
      "On a special agar called CHROMagar Candida, Candi's colonies turn green.",
      "Candi builds slimy biofilms on catheters and other medical devices.",
      "Antibiotics can let Candi overgrow by killing the bacteria that usually keep her in check.",
      "Candi makes a toxin called candidalysin that punches holes in human cells.",
      "On cornmeal agar, Candi makes chlamydospores: big, round, thick-walled cells.",
      "Candi's cousin *Candida auris* was first described in 2009 and resists many antifungals.",
    ],
    scientific: 'Candida albicans',
    color: '#1d4ed8', // for her name above the dish
    kind: 'yeast',
    colors: { fill: '#d6e8ff', stroke: '#2563eb', highlight: '#ffffff', dark: '#1e3a8a' },
    antifungals: [
      { code: 'FLC', name: 'fluconazole', zone: 30 },
      { code: 'NY', name: 'nystatin', zone: 21 },
      { code: 'VOR', name: 'voriconazole', zone: 31 },
      { code: 'MCF', name: 'micafungin', zone: 27 },
      { code: 'CAS', name: 'caspofungin', zone: 22 },
    ],
  },
  olive: {
    facts: [
      "Olive's genus, *Malassezia*, is named for Louis-Charles Malassez, a French scientist.",
      "Olive's species name, *furfur*, is Latin for \"bran,\" after the flaky scales she causes.",
      "Yeasts in Olive's genus were once called *Pityrosporum*, a name meaning \"bran spore.\"",
      "Yeasts in Olive's genus live on most people's skin, especially oily spots like the scalp.",
      "Olive can't make her own fatty acids, so she eats the oils on your skin.",
      "One way to grow Olive in the lab is to add a thin layer of olive oil to her culture plate.",
      "Olive buds again and again from one end, so her cells can look like little bowling pins.",
      "Olive has a little collar at her budding site, called a collarette.",
      "*Malassezia* yeasts like Olive play a part in dandruff.",
      "Olive can cause pityriasis versicolor: patches of skin that turn lighter or darker.",
      "Scraped from her rash, Olive's hyphae and yeasts look like \"spaghetti and meatballs.\"",
      "Olive can infect preemies' blood via IV lines that feed them fats, which help her grow.",
      "Olive is a basidiomycete yeast, on the same big fungal branch as cap-and-stem mushrooms.",
    ],
    scientific: 'Malassezia furfur',
    color: '#556b14', // for her name above the dish
    kind: 'yeast',
    // She buds again and again from the same end of her cell (monopolar
    // budding), so her bud always grows from the top.
    budsFromOneEnd: true,
    colors: { fill: '#d9e6a6', stroke: '#6b7a2a', highlight: '#f7faea', dark: '#3a4410' },
    // Malassezia has no standard disk sizes, so these are estimates
    antifungals: [
      { code: 'KCA', name: 'ketoconazole', zone: 32 },
      { code: 'ITC', name: 'itraconazole', zone: 28 },
      { code: 'VOR', name: 'voriconazole', zone: 26 },
      { code: 'AMB', name: 'amphotericin B', zone: 17 },
    ],
  },
  fumi: {
    facts: [
      "Fumi's species name, *fumigatus*, means \"smoky,\" after her gray-green colonies.",
      "Fumi's genus is named for the aspergillum, a sprinkler for shaking holy water.",
      "Pier Antonio Micheli named Fumi's genus, *Aspergillus*, in 1729.",
      "Fumi grows as long threads called hyphae, which stretch from their tips.",
      "Fumi's hyphae have cross-walls called septa, splitting them into compartments.",
      "Fumi's hyphae branch at sharp angles, about 45 degrees.",
      "Fumi makes her spores in straight columns on top of a swollen stalk.",
      "Fumi can grow at 50°C, hotter than most fungi can stand, so she thrives in compost.",
      "Fumi's spores are only 2 to 3 µm across, small enough to reach deep into the lungs.",
      "You breathe in hundreds of Fumi's spores a day, but healthy lungs clear them.",
      "Fumi can cause aspergillosis, a lung infection, in people with weak immune systems.",
      "Fluconazole doesn't work on Fumi, but voriconazole is a first choice against her.",
      "Fumi is a mold, not a yeast: she never buds, she just keeps growing and branching.",
    ],
    scientific: 'Aspergillus fumigatus',
    color: '#3f665b', // for her name above the dish
    // A mold: she grows as threads (hyphae) from a tip you steer, instead of
    // budding (see mold.js).
    kind: 'mold',
    colors: { fill: '#dbe7e1', stroke: '#4b6b61', highlight: '#f3f8f5', dark: '#22392f' },
    // Molds have few standard disk sizes (CLSI M51), so these are estimates
    // from how well each drug works on her. Voriconazole, the usual first
    // choice for aspergillosis, comes first. Aspergillus is naturally
    // resistant to fluconazole, so it has no zone at all.
    antifungals: [
      { code: 'VOR', name: 'voriconazole', zone: 28 },
      { code: 'ITC', name: 'itraconazole', zone: 24 },
      { code: 'FLC', name: 'fluconazole', zone: null },
      { code: 'AMB', name: 'amphotericin B', zone: 18 },
      { code: 'CAS', name: 'caspofungin', zone: 20 },
    ],
  },
};

// Each level adds an antifungal disk and doubles the colony you need to grow.
export const LEVELS = [
  { disks: 1, target: 4 },
  { disks: 2, target: 8 },
  { disks: 3, target: 16 },
  { disks: 4, target: 32 },
  { disks: 5, target: 64 },
  { disks: 6, target: 128 },
  { disks: 7, target: 256 },
];

export const GAME = {
  GROUP_CAP: 8, // max cells per cluster
  SNAP_REACH: 0.3, // bud attachment range, relative to dish radius
  NUTRIENTS_PER_DIVISION: 1, // nutrients per bud
  SPEED: 0.8, // dish radii per second
  ARRIVE: 0.01, // pointer tolerance, relative to dish radius
  DRAG_SPEED: 2, // drag cap in radii/sec; prevents skipping zones
  BURST_SPEED: 0.1, // split-off push; travel ≈ 0.5 × speed / settle rate
  SETTLE_RATE: 4, // slowdown rate; higher stops sooner
  SETTLE_MS: 1500, // time until offspring stay put
  SPACING: 0.5, // minimum spacing as a fraction of combined cell reach
  DIVIDE_MS: 600,

  // Disk size, center distance, and center-to-center gap in dish radii.
  DISK_RADIUS: 0.085,
  DISK_MIN_DISTANCE: 0.4,
  DISK_MAX_DISTANCE: 0.65,
  DISK_MIN_GAP: 0.4,

  // Zones block offspring and kill the player; mm maps linearly to width,
  // clamped to these limits. Widths are fractions of the dish radius.
  ZONE_MM_SMALL: 13,
  ZONE_MM_BIG: 40,
  ZONE_MIN_WIDTH: 0.02,
  ZONE_MAX_WIDTH: 0.075,

  // Zones grow from this fraction to full width over this many seconds.
  ZONE_START: 0.1,
  ZONE_SPREAD_SECONDS: 20,
  SWIM_ROOM: 0.13, // minimum gap between zones, in dish radii
  // Molds (Fumi) don't bud or swim: she grows as threads (hyphae) from her
  // tips (see mold.js). Lengths are fractions of the dish radius.
  MOLD: {
    TIP_SPEED: 0.3, // how fast each tip grows while she has stored growth
    CREEP_SPEED: 0.1, // how fast her lead tip grows with none stored
    START_GROWTH: 0.05, // stored growth she starts with
    NUTRIENT_GROWTH: 0.07, // stored growth from each nutrient, for each growing tip
    CELL_LENGTH: 0.1, // each this much of thread is one more cell
    TURN: 0.12, // the radius of her tightest turn, so she never makes corners
    BRANCH_ANGLE: Math.PI / 4, // branches sprout about 45 degrees off
    BRANCH_COOLDOWN: 0.25, // seconds between branches
    RIM: 0.94, // tips can't grow past this far from the center
    WIDTH: 0.02, // how thick a thread is drawn
    TIP_SIZE: 0.1, // her face, on her lead tip
    POINT: 0.012, // a thread gets a new point every this far
    WAVE: 0.014, // how much a thread is drawn wiggling side to side
    WAVELENGTH: 0.2, // and how long each wiggle is
  },
};

// How each pal grows. For now every pal is a yeast: a single round cell that
// buds each time she eats. Her daughters stay stuck together in little
// clusters, the way budding yeast often does on a plate. (Molds, which grow
// as long threads called hyphae, are coming next.)
//
// Each antifungal's `zone` is the zone of inhibition around its disk, as the
// diameter in millimeters a lab would measure for a susceptible strain of
// that species. Candida has a standard disk test (CLSI M44), so Candi's are
// ballpark figures from it. Saccharomyces has no standard disk sizes, so
// Sasha's are estimates from how well each drug works on her. The game
// scales these down to fit the dish (see ZONE_* below).
//
// `antifungals` are the disks placed in each pal's dish, in order (level 1
// uses the first, level 5 all five), labeled with their standard disk codes.
//
// `scientific` is the species name shown above the dish, with the pal's name
// in her `color`. It's all in italics, unless it marks the italic part
// between asterisks.
//
// `colors` paint her daughter cells in the dish.
// `facts` are short fun facts about each pal; one is shown at random in the
// pop-up at the end of every level, win or lose (see game/facts.js). Put
// other species' scientific names between asterisks (*Candida auris*) and
// the pop-up shows them in italics.
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
      // Saccharomyces is only weakly held back by fluconazole: a small zone.
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
    color: '#6d28d9', // for her name above the dish
    kind: 'yeast',
    colors: { fill: '#faf5ff', stroke: '#7c3aed', highlight: '#ffffff', dark: '#4c1d95' },
    antifungals: [
      { code: 'FLC', name: 'fluconazole', zone: 30 },
      { code: 'NY', name: 'nystatin', zone: 21 },
      { code: 'VOR', name: 'voriconazole', zone: 31 },
      { code: 'MCF', name: 'micafungin', zone: 27 },
      { code: 'CAS', name: 'caspofungin', zone: 22 },
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
];

export const GAME = {
  GROUP_CAP: 8, // clusters stop growing at this many cells
  // A new bud joins a cluster if the player is within this
  // distance of where it would attach (a fraction of the dish radius).
  SNAP_REACH: 0.3,
  NUTRIENTS_PER_DIVISION: 1, // nutrients the player eats before budding
  SPEED: 0.8, // player speed, as a fraction of the dish radius per second
  // Steering with a mouse, how close to the pointer counts as there (so she
  // settles instead of jittering on the spot), as a fraction of the dish radius.
  ARRIVE: 0.01,
  // Dragging her with a finger, she moves as far as the finger does, up to
  // DRAG_SPEED (a fraction of the dish radius per second) so she keeps up
  // with ordinary dragging. Even that fast she moves less per frame than an
  // antifungal disk is wide, so a swipe can't skip over a zone.
  DRAG_SPEED: 2,
  // How hard a new group pushes away when it splits off. It slides about
  // half of BURST_SPEED / SETTLE_RATE of the dish radius before
  // it stops: far enough to see, short enough not to slide into a zone easily.
  BURST_SPEED: 0.1,
  SETTLE_RATE: 4, // how quickly a new group slows to a stop (higher = sooner)
  SETTLE_MS: 1500, // after this long, offspring stay put for good
  // How close two new cells can settle before they nudge each other apart:
  // their centers stay at least SPACING times their combined reach apart.
  // Lower lets them pile up more, the way cells on a plate grow on top of
  // each other, which leaves room for big colonies on crowded levels.
  SPACING: 0.5,
  DIVIDE_MS: 600,
  // The antifungal disks: their radius, how far from the center they can go,
  // and how far apart they must be, center to center (all as fractions of the
  // dish radius). They never sit on the starting spot.
  DISK_RADIUS: 0.085,
  DISK_MIN_DISTANCE: 0.4,
  DISK_MAX_DISTANCE: 0.65,
  DISK_MIN_GAP: 0.4,
  // The zone of inhibition: the clear ring around each disk where the drug
  // has soaked into the agar. Offspring grow right up to its edge but never
  // into it, and the player touching it is game over. Its width comes from
  // the drug's zone in mm: ZONE_MM_SMALL mm or less is ZONE_MIN_WIDTH wide,
  // ZONE_MM_BIG mm or more is ZONE_MAX_WIDTH, and in between scales evenly
  // (widths are fractions of the dish radius).
  ZONE_MM_SMALL: 13,
  ZONE_MM_BIG: 40,
  ZONE_MIN_WIDTH: 0.02,
  ZONE_MAX_WIDTH: 0.075,
  // Zones spread: on a real plate the drug soaks outward from the disk, so
  // the zone starts small and widens. Each zone starts at ZONE_START of its
  // full width and reaches full width after ZONE_SPREAD_SECONDS. (A real
  // zone takes hours to form while the plate incubates; sped up for the game.)
  ZONE_START: 0.1,
  ZONE_SPREAD_SECONDS: 20,
  // Room to swim between two neighboring zones, at least.
  SWIM_ROOM: 0.13,
};

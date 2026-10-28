// The FunGals family tree: how the gals are related, simplified to show
// only the gals in the game. Each branch has a kid-friendly name, its
// science name (sci) where it has one, and a short note. Leaves are gal ids.
const gals = (...ids) => ids.map((leaf) => ({ leaf }));

export const TREE = {
  id: 'fungi',
  name: 'Fungi',
  note: 'They soak up food from around them, and their cell walls are made of chitin.',
  kids: [
    {
      id: 'chytrids', name: 'Chytrids', sci: 'Chytridiomycota',
      note: 'One of the earliest branches of the fungal family tree.',
      kids: gals('bea'),
    },
    {
      id: 'dikarya',
      name: 'Dikarya',
      note: 'Spores that don’t swim. Cells that can hold two separate nuclei.',
      kids: [
        {
          id: 'sac', name: 'Sac fungi', sci: 'Ascomycota',
          note: 'Make their spores inside a tiny sac.',
          kids: [
            {
              id: 'budding', name: 'Budding yeasts', sci: 'Saccharomycotina',
              note: 'Single cells that bud to multiply.',
              kids: gals('sasha', 'candi', 'peachy', 'yara'),
            },
            {
              id: 'molds', name: 'Filamentous sac fungi', sci: 'Pezizomycotina',
              note: 'Threads that spread, and stalks that make spores.',
              kids: [
                {
                  id: 'aspergillus', name: 'Molds and more', sci: 'Eurotiomycetes',
                  note: 'Spores in chains or bunches.',
                  kids: gals('fumi', 'miri', 'penelope', 'trixie'),
                },
                {
                  id: 'flask', name: 'Flask fungi', sci: 'Sordariomycetes',
                  note: 'Many make their spores in flask-shaped bodies.',
                  kids: gals('rosie'),
                },
              ],
            },
          ],
        },
        {
          id: 'club', name: 'Club fungi', sci: 'Basidiomycota',
          note: 'Make their spores on tiny club-shaped cells.',
          kids: [
            {
              id: 'mushrooms', name: 'Mushrooms and jelly fungi', sci: 'Agaricomycotina',
              note: 'Most of the mushrooms you know, plus some yeasts.',
              kids: gals('velma', 'ruby', 'neve'),
            },
            {
              id: 'smuts', name: 'Smuts and cousins', sci: 'Ustilaginomycotina',
              note: 'Plant smuts, and some yeasts that live on skin.',
              kids: gals('maizey', 'olive'),
            },
          ],
        },
      ],
    },
  ],
};

// Every branch and leaf by id, each knowing its parent.
const byId = new Map();
(function index(node, parent) {
  node.parent = parent;
  byId.set(node.id ?? node.leaf, node);
  for (const kid of node.kids ?? []) index(kid, node);
})(TREE, null);

export const branchById = (id) => byId.get(id) ?? null;

// The branches from the top of the tree down to `id` (a branch or a gal),
// not counting the gal herself.
export function lineage(id) {
  const out = [];
  for (let node = byId.get(id); node; node = node.parent) if (!node.leaf) out.unshift(node);
  return out;
}

// Every gal on a branch, however far down, in order.
export function galsOn(branch) {
  return branch.kids.flatMap((kid) => (kid.leaf ? [kid.leaf] : galsOn(kid)));
}

// Every pal's drawing, in one place. The home page, the pal picker and the
// petri dish all draw the pals from here, so a change to how a pal looks
// only has to be made once.
//
// The list is in the order the pals appear on the home page (the picker
// shuffles them).
// Each pal has:
//   id      her key, matching SPECIES in config.js and ?pal= in addresses
//   name    what she's called
//   looks   what a screen reader says after her name
//   motion  her idle animation in styles.css (bob, squish, wobble or slither)
//   frames  the part of the drawing each page shows (an SVG viewBox), so each
//           page can frame her its own way: a little room around her on the
//           home page, filling her tile on the picker, snug in the dish
//   art     the drawing itself, in a 200 x 200 space. Wrap the face in
//           <g class="face">.
//
// To add a pal: add her to the end of this list and to SPECIES in config.js,
// and give her tile a color in styles.css (.<id> next to .sasha and the
// others).

const SVG = 'http://www.w3.org/2000/svg';

// A cute face: eyes with a glint, rosy cheeks and a smile, centered on
// (x, y), in the pal's `dark` color.
const face = (x, y, dark) => `
      <g class="face">
        <circle cx="${x - 11}" cy="${y}" r="6" fill="${dark}" />
        <circle cx="${x + 11}" cy="${y}" r="6" fill="${dark}" />
        <circle cx="${x - 9}" cy="${y - 2}" r="2" fill="white" />
        <circle cx="${x + 13}" cy="${y - 2}" r="2" fill="white" />
        <ellipse cx="${x - 21}" cy="${y + 12}" rx="6" ry="3.5" fill="#f9a8d4" opacity="0.8" />
        <ellipse cx="${x + 21}" cy="${y + 12}" rx="6" ry="3.5" fill="#f9a8d4" opacity="0.8" />
        <path d="M${x - 6} ${y + 12} Q${x} ${y + 18} ${x + 6} ${y + 12}" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round" />
      </g>`;

export const PALS = [
  // Sasha: Saccharomyces cerevisiae, a wheat-colored oval yeast cell with a
  // bud growing out of her side and two bud scars from daughters she's had
  {
    id: 'sasha',
    name: 'Sasha',
    looks: 'a wheat-colored oval Saccharomyces yeast cell with a little bud growing from her side',
    motion: 'squish',
    frames: { home: '28 20 160 160', picker: '36 28 144 144', dish: '40 32 136 136' },
    art: `
      <!-- the bud, swelling out of her upper right -->
      <circle cx="150" cy="62" r="20" fill="#f3dfbf" stroke="#8a5a2b" stroke-width="4" />
      <circle cx="144" cy="55" r="4" fill="#fbf3e4" />
      <!-- the mother cell -->
      <ellipse cx="100" cy="112" rx="52" ry="44" fill="#f3dfbf" stroke="#8a5a2b" stroke-width="4" />
      <ellipse cx="80" cy="86" rx="9" ry="5" fill="#fbf3e4" transform="rotate(-25 80 86)" />
      <!-- bud scars, one for each daughter she's had -->
      <ellipse cx="62" cy="132" rx="6" ry="4" fill="none" stroke="#b08250" stroke-width="2.5" />
      <ellipse cx="138" cy="132" rx="6" ry="4" fill="none" stroke="#b08250" stroke-width="2.5" />
      ${face(100, 112, '#5b3a1e')}
    `,
  },
  // Candi: Candida albicans, a pale lilac oval yeast cell with lavender
  // edges, a bud growing out of her upper left and two bud scars
  {
    id: 'candi',
    name: 'Candi',
    looks: 'a pale lilac oval Candida albicans yeast cell with a little bud growing from her side',
    motion: 'bob',
    frames: { home: '12 20 160 160', picker: '20 28 144 144', dish: '24 32 136 136' },
    art: `
      <!-- the bud, swelling out of her upper left: Sasha's bud, mirrored, so
           both attach the same way -->
      <circle cx="50" cy="62" r="20" fill="#e4d3ff" stroke="#7c3aed" stroke-width="4" />
      <circle cx="44" cy="55" r="4" fill="#ffffff" />
      <!-- the mother cell, the same size as Sasha's -->
      <ellipse cx="100" cy="112" rx="52" ry="44" fill="#e4d3ff" stroke="#7c3aed" stroke-width="4" />
      <ellipse cx="80" cy="86" rx="9" ry="5" fill="#ffffff" transform="rotate(-25 80 86)" />
      <!-- bud scars, one for each daughter she's had, like Sasha's -->
      <ellipse cx="62" cy="132" rx="6" ry="4" fill="none" stroke="#a78bfa" stroke-width="2.5" />
      <ellipse cx="138" cy="132" rx="6" ry="4" fill="none" stroke="#a78bfa" stroke-width="2.5" />
      ${face(100, 112, '#4c1d95')}
    `,
  },
];

// Both pals fit in the home page's row.
export const HOME_PALS = PALS;

// How many pals fit on one page of the picker: four across, two down.
export const PAGE_SIZE = 8;

// `pals` split into the picker's pages, in order, PAGE_SIZE to a page (the
// last page has whoever is left over).
export function pickerPages(pals = PALS, size = PAGE_SIZE) {
  const pages = [];
  for (let i = 0; i < pals.length; i += size) pages.push(pals.slice(i, i + size));
  return pages;
}

// A copy of `pals` in a random order (a Fisher-Yates shuffle, so every order
// is equally likely). The picker uses it so no pal is always first.
export function inRandomOrder(pals, random = Math.random) {
  const order = [...pals];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function palById(id) {
  return PALS.find((pal) => pal.id === id);
}

// Her drawing as an <svg>, framed for `page` ('home', 'picker' or 'dish').
function drawing(pal, page) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', pal.frames[page]);
  svg.innerHTML = pal.art;
  // Anything drawn with SVG's own <animate> moves on the home page and in
  // the dish, but stays still on the picker, and for anyone who has asked for
  // less motion (CSS can't pause <animate>).
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (page === 'picker' || reduced) {
    for (const wiggle of svg.querySelectorAll('animate')) wiggle.remove();
  }
  return svg;
}

// For the home page's row of pals.
export function homePal(pal) {
  const svg = drawing(pal, 'home');
  svg.setAttribute('class', `pal ${pal.motion}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${pal.name}, ${pal.looks}`);
  return svg;
}

// Her picture on a colored tile, for the picker. The name
// next to it says who she is, so the picture is hidden from screen readers.
export function palTile(pal) {
  const tile = document.createElement('div');
  tile.className = `pal-icon ${pal.id}`;
  const svg = drawing(pal, 'picker');
  svg.setAttribute('aria-hidden', 'true');
  tile.append(svg);
  return tile;
}

// For the petri dish, hidden until the game picks her (main.js).
export function dishPal(pal) {
  const svg = drawing(pal, 'dish');
  svg.setAttribute('class', `dish-pal ${pal.motion}`);
  svg.dataset.pal = pal.id;
  svg.dataset.name = pal.name;
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${pal.name}, ${pal.looks}`);
  svg.setAttribute('hidden', '');
  return svg;
}

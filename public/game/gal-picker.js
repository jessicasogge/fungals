// The gal picker: a card for each gal, with her picture, name and species;
// the whole card is the button that picks her. The gals are in A-to-Z order
// by scientific name, split into pages of eight (PAGE_SIZE in gals.js), shown
// one at a time with Back and More gals buttons to move between them. The
// page you were on is remembered for this tab, so coming back from the dish
// lands you where you left off.
import { SPECIES } from './config.js';
import { speciesName } from './italics.js';
import { pageReady, watchLoading } from './loading.js';
import { byScientificName, galTile, pickerPages } from './gals.js';

// "Growing the colony…" while the next screen loads.
watchLoading();

// Every page is made up front and the ones not showing are hidden, so a page
// you come back to looks the same as when you left it.
const pages = pickerPages(byScientificName()).map((gals, i) => {
  const grid = document.createElement('div');
  grid.className = 'picker-grid';
  grid.dataset.page = String(i + 1);
  grid.append(...gals.map(card));
  return grid;
});
document.querySelector('.picker-pages').append(...pages);

const back = document.querySelector('.pager-back');
const more = document.querySelector('.pager-more');
let current = 0;

// The page you were on, kept for this tab only. Storage can be missing or
// blocked (a private window), and then the picker just starts on page 1.
const PAGE_KEY = 'fungals-picker-page';
function savedPage() {
  try {
    const page = Number(sessionStorage.getItem(PAGE_KEY));
    return Number.isInteger(page) && page >= 0 && page < pages.length ? page : 0;
  } catch {
    return 0;
  }
}

function showPage(index) {
  current = index;
  try {
    sessionStorage.setItem(PAGE_KEY, String(index));
  } catch {
    // Nowhere to remember it; that's fine.
  }
  pages.forEach((grid, i) => {
    grid.hidden = i !== index;
  });
  back.hidden = index === 0;
  more.hidden = index === pages.length - 1;
  // With only one page there's nothing to page through.
  document.querySelector('.picker-pager').hidden = pages.length < 2;
}

back.addEventListener('click', () => {
  showPage(current - 1);
  // The Back button is gone on the first page, so keep the keyboard nearby.
  if (back.hidden) more.focus();
});
more.addEventListener('click', () => {
  showPage(current + 1);
  if (more.hidden) back.focus();
});
showPage(savedPage());

function card(gal) {
  const link = document.createElement('a');
  link.className = 'gal-card';
  link.href = `./petri-dish.html?pal=${gal.id}`;
  link.setAttribute('aria-label', `Pick ${gal.name}`);

  const name = document.createElement('h2');
  name.textContent = gal.name;

  const species = document.createElement('p');
  species.className = 'species';
  species.append(...speciesName(SPECIES[gal.id].scientific));

  link.append(galTile(gal), name, species);
  return link;
}

// All filled in: take the loading card away.
pageReady();

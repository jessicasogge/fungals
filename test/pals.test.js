// @vitest-environment jsdom
// The pals' drawings (pals.js), and the pages that draw them: the home page,
// the picker and the petri dish. The pages are loaded into
// jsdom, a simulated browser page.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SPECIES } from '../public/game/config.js';
import { plainText } from '../public/game/italics.js';
import { dishPal, HOME_PALS, homePal, inRandomOrder, PAGE_SIZE, palById, PALS, palTile, pickerPages } from '../public/game/pals.js';

// (jsdom changes import.meta.url to a web address, so find files from the project folder.)
const file = (name) => readFileSync(resolve(process.cwd(), 'public', name), 'utf8');
const css = file('styles.css');
const IDS = PALS.map((pal) => pal.id);

// Open `page` at `search` and run `script` on it.
async function open(page, script, search = '') {
  const html = file(page);
  vi.stubGlobal('location', { search, href: `http://localhost/${page}${search}`, replace: vi.fn() });
  document.body.outerHTML = html.slice(html.indexOf('<body'), html.indexOf('</body>'));
  vi.resetModules();
  await import(`../public/${script}`);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the pals', () => {
  it('are the same pals as in config.js, each once', () => {
    expect([...IDS].sort()).toEqual(Object.keys(SPECIES).sort());
    expect(new Set(IDS).size).toBe(IDS.length);
  });

  it('splits into pages of eight for the picker (a tidy four-by-two), with the rest on the last page', () => {
    expect(PAGE_SIZE).toBe(8);
    const pages = pickerPages();
    expect(pages).toHaveLength(Math.ceil(PALS.length / PAGE_SIZE));
    expect(pages.flat()).toEqual(PALS);
    expect(pickerPages(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
    expect(pickerPages(['a', 'b'], 2)).toEqual([['a', 'b']]);
  });

  it.each(PALS)('$id has a name and a description', (pal) => {
    expect(pal.name).toMatch(/^[A-Z][a-z]+$/);
    // Her species is in the description, so a screen reader says what she is.
    expect(pal.looks).toContain(plainText(SPECIES[pal.id].scientific).split(' ')[0]);
  });

  it.each(PALS)("$id's idle animation and tile color are in styles.css", (pal) => {
    expect(css).toMatch(new RegExp(`\\n\\.${pal.motion} \\{[^}]*animation:`));
    expect(css).toMatch(new RegExp(`\\n\\.${pal.id} \\{[^}]*background:`));
  });

  it.each(PALS)('$id is framed for every page', (pal) => {
    expect(Object.keys(pal.frames).sort()).toEqual(['dish', 'home', 'picker']);
    for (const box of Object.values(pal.frames)) {
      // x y width height, and square, since every page shows her in a square.
      const [, , w, h] = box.split(' ').map(Number);
      expect(box).toMatch(/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/);
      expect(w).toBe(h);
    }
  });

  it.each(PALS)('$id has a face', (pal) => {
    expect(palTile(pal).querySelector('.face')).not.toBeNull();
  });

  it('are found by id, and nothing else is', () => {
    expect(palById('candi').name).toBe('Candi');
    expect(palById('toString')).toBeUndefined();
    expect(palById(null)).toBeUndefined();
  });
});

describe('her drawing', () => {
  const sasha = palById('sasha');

  it('is real SVG, not just text', () => {
    const svg = homePal(sasha);
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.querySelector('ellipse').namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('on the home page, animates and says who she is', () => {
    const svg = homePal(sasha);
    expect(svg.getAttribute('viewBox')).toBe(sasha.frames.home);
    expect(svg.getAttribute('class')).toBe('pal squish');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe(`Sasha, ${sasha.looks}`);
  });

  it('on a tile, has her tile color and is hidden from screen readers', () => {
    const tile = palTile(sasha);
    expect(tile.className).toBe('pal-icon sasha');
    expect(tile.firstChild.getAttribute('viewBox')).toBe(sasha.frames.picker);
    expect(tile.firstChild.getAttribute('aria-hidden')).toBe('true');
  });

  it('in the dish, starts hidden and carries her id and name', () => {
    const svg = dishPal(sasha);
    expect(svg.getAttribute('viewBox')).toBe(sasha.frames.dish);
    expect(svg.getAttribute('class')).toBe('dish-pal squish');
    expect(svg.dataset).toMatchObject({ pal: 'sasha', name: 'Sasha' });
    expect(svg.hasAttribute('hidden')).toBe(true);
  });
});

describe('moving parts', () => {
  // A pal with a bit of SVG animation, like a wiggling hypha.
  const wiggly = { ...palById('candi'), art: '<path d="M0 0 L1 1"><animate attributeName="d" values="M0 0 L1 1;M0 0 L1 2" /></path>' };
  afterEach(() => vi.unstubAllGlobals());

  it('move on the home page and in the dish', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(homePal(wiggly).querySelector('animate')).not.toBeNull();
    expect(dishPal(wiggly).querySelector('animate')).not.toBeNull();
  });

  it('hold still on the picker', () => {
    expect(palTile(wiggly).querySelector('animate')).toBeNull();
  });

  it('hold still for anyone who prefers less motion', () => {
    vi.stubGlobal('matchMedia', (query) => ({ matches: query.includes('reduce') }));
    expect(dishPal(wiggly).querySelector('animate')).toBeNull();
  });
});

describe('inRandomOrder', () => {
  it('keeps every pal, each once, and leaves PALS as it was', () => {
    const before = [...PALS];
    const order = inRandomOrder(PALS);
    expect(order).not.toBe(PALS);
    expect([...order].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...PALS].sort((a, b) => a.id.localeCompare(b.id)),
    );
    expect(PALS).toEqual(before);
  });

  it('can put any pal first', () => {
    // Over many shuffles, every pal leads at least once.
    const firsts = new Set();
    for (let i = 0; i < 500; i++) firsts.add(inRandomOrder(PALS)[0].id);
    expect(firsts.size).toBe(PALS.length);
  });

  it('follows the random numbers it is given', () => {
    expect(inRandomOrder(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a']);
    expect(inRandomOrder(['a', 'b', 'c'], () => 0.99)).toEqual(['a', 'b', 'c']);
  });
});

describe('the pages', () => {
  afterEach(() => {
    vi.doUnmock('../public/game/pals.js');
    vi.restoreAllMocks();
  });

  it('home shows every pal in its row, in order', async () => {
    await open('index.html', 'script.js');
    const labels = [...document.querySelectorAll('.friends svg')].map((s) => s.getAttribute('aria-label'));
    expect(labels).toEqual(HOME_PALS.map((pal) => `${pal.name}, ${pal.looks}`));
    // Every pal, each once, with Olive in the middle.
    expect(HOME_PALS.map((pal) => pal.id)).toEqual(['sasha', 'olive', 'candi']);
    expect([...HOME_PALS].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...PALS].sort((a, b) => a.id.localeCompare(b.id)));
  });

  it('the picker has a card for every pal, each once, linking to her dish', async () => {
    await open('pal-picker.html', 'game/pal-picker.js');
    const cards = [...document.querySelectorAll('.pal-card')];
    const names = cards.map((c) => c.querySelector('h2').textContent);
    expect([...names].sort()).toEqual(PALS.map((pal) => pal.name).sort());
    for (const card of cards) {
      const { id, name } = PALS.find((pal) => pal.name === card.querySelector('h2').textContent);
      expect(card.querySelector('.pal-icon').classList).toContain(id);
      expect(card.querySelector('.species').textContent).toBe(plainText(SPECIES[id].scientific));
      expect(card.querySelector('.species i')).not.toBeNull(); // in italics
      expect(card.querySelector('a').getAttribute('href')).toBe(`./petri-dish.html?pal=${id}`);
      expect(card.querySelector('a').textContent).toBe(`Select ${name}`);
    }
  });

  it('the picker shuffles all the pals together, then splits them into pages', async () => {
    // With Math.random always 0, the shuffle moves the first pal to the end.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await open('pal-picker.html', 'game/pal-picker.js');
    const grids = [...document.querySelectorAll('.picker-grid')];
    const names = grids.map((grid) => [...grid.querySelectorAll('.pal-card h2')].map((h) => h.textContent));
    expect(names).toEqual(pickerPages(inRandomOrder(PALS, () => 0)).map((page) => page.map((pal) => pal.name)));
    expect(names.flat().at(-1)).toBe(PALS[0].name);
  });

  it('the picker hides the pager while every pal fits on one page', async () => {
    await open('pal-picker.html', 'game/pal-picker.js');
    expect(document.querySelectorAll('.picker-grid')).toHaveLength(1);
    expect(document.querySelector('.picker-pager').hidden).toBe(true);
  });

  it('the picker shows one page at a time, with More pals and Back buttons between them', async () => {
    // One pal to a page, so there's more than one page to go through.
    vi.doMock('../public/game/pals.js', async (importActual) => {
      const real = await importActual();
      return { ...real, pickerPages: (pals) => real.pickerPages(pals, 1) };
    });
    await open('pal-picker.html', 'game/pal-picker.js');
    const grids = [...document.querySelectorAll('.picker-grid')];
    const back = document.querySelector('.pager-back');
    const more = document.querySelector('.pager-more');
    const showing = () => grids.filter((grid) => !grid.hidden).map((grid) => grid.dataset.page);
    expect(grids).toHaveLength(PALS.length);
    expect(document.querySelector('.picker-pager').hidden).toBe(false);

    // Opens on the first page, with only More pals to press.
    expect(showing()).toEqual(['1']);
    expect(back.hidden).toBe(true);
    expect(more.hidden).toBe(false);
    expect(more.tagName).toBe('BUTTON');

    // More pals all the way to the last page.
    for (let page = 2; page <= grids.length; page++) {
      more.click();
      expect(showing()).toEqual([String(page)]);
      expect(back.hidden).toBe(false);
    }
    expect(more.hidden).toBe(true);
    expect(document.activeElement).toBe(back); // the keyboard stays on the pager
    // Back to the first page.
    for (let page = grids.length - 1; page > 1; page--) back.click();
    back.click();
    expect(showing()).toEqual(['1']);
    expect(back.hidden).toBe(true);
    expect(document.activeElement).toBe(more);
  });

  it("keeps a short page's pals in the middle, and hides pages that aren't showing", () => {
    expect(css).toMatch(/\n\.picker-grid \{[^}]*justify-content: center;/);
    expect(css).toMatch(/\n\.picker-grid\[hidden\] \{\s*display: none;/);
  });

  it("the pages don't draw any pals by hand", () => {
    for (const page of ['index.html', 'pal-picker.html', 'petri-dish.html', 'whos-that-gal.html']) {
      expect(file(page), page).not.toContain('<svg');
    }
  });
});

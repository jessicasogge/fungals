// @vitest-environment jsdom
// main.js starts the petri dish page from its address, e.g.
// petri-dish.html?pal=sasha&level=2. These tests load the real page into
// jsdom, a simulated browser page, and check it picks the right pal and
// level, and copes with addresses that are broken or made up.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME, LEVELS, SPECIES } from '../public/game/config.js';

// Don't run the real game loop; just record how the game was started.
vi.mock('../public/game/game.js', () => ({ playGame: vi.fn() }));
vi.mock('../public/game/mold.js', () => ({ playMold: vi.fn() }));

// (jsdom changes import.meta.url to a web address, so find the file from the project folder.)
const page = readFileSync(resolve(process.cwd(), 'public/petri-dish.html'), 'utf8');
const body = page.slice(page.indexOf('<body'), page.indexOf('</body>'));

let location;

// Open the dish page at `search` (like '?pal=sasha&level=2') and run main.js.
async function open(search) {
  location = { search, href: `http://localhost/petri-dish.html${search}`, replace: vi.fn() };
  vi.stubGlobal('location', location);
  document.body.outerHTML = body;
  vi.resetModules();
  await import('../public/game/main.js');
  const { playGame } = await import('../public/game/game.js');
  return playGame;
}

beforeEach(() => {
  document.title = 'FunGals | Petri Dish';
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('picking the pal', () => {
  it('shows the chosen pal and hides the others', async () => {
    await open('?pal=candi');
    const shown = [...document.querySelectorAll('.dish-pal:not([hidden])')];
    expect(shown.map((el) => el.dataset.pal)).toEqual(['candi']);
  });

  it('puts her name, in her color, and species above the dish', async () => {
    await open('?pal=candi');
    const name = document.querySelector('.pal-name');
    expect(name.textContent).toBe('Candi');
    // jsdom reports colors as rgb(), so compare against the same color set the same way.
    const expected = document.createElement('span');
    expected.style.color = SPECIES.candi.color;
    expect(name.style.color).toBe(expected.style.color);
    expect(document.querySelector('.species-name').textContent).toBe(SPECIES.candi.scientific);
  });

  it('names the pal and level in the tab title', async () => {
    await open('?pal=sasha&level=3');
    expect(document.title).toBe('FunGals | Sasha | Level 3');
  });

  const YEASTS = Object.keys(SPECIES).filter((pal) => SPECIES[pal].kind === 'yeast');
  it.each(YEASTS)('starts the game for %s with her own species settings', async (pal) => {
    const playGame = await open(`?pal=${pal}`);
    expect(playGame).toHaveBeenCalledTimes(1);
    const [palEl, species] = playGame.mock.calls[0];
    expect(palEl.dataset.pal).toBe(pal);
    expect(species).toEqual(SPECIES[pal]);
  });
});

describe('a mold', () => {
  async function openMold(search) {
    await open(search);
    const { playMold } = await import('../public/game/mold.js');
    return playMold;
  }

  it('starts the mold game for Fumi, not the yeast one', async () => {
    const playMold = await openMold('?pal=fumi');
    const { playGame } = await import('../public/game/game.js');
    expect(playGame).not.toHaveBeenCalled();
    expect(playMold).toHaveBeenCalledTimes(1);
    const [palEl, species] = playMold.mock.calls[0];
    expect(palEl.dataset.pal).toBe('fumi');
    expect(species).toEqual(SPECIES.fumi);
  });

  it('aims for that level\'s number of colonies, not cells', async () => {
    const playMold = await openMold('?pal=fumi&level=3');
    const options = playMold.mock.calls[0][4];
    expect(options.level).toBe(3);
    expect(options.target).toBe(LEVELS[2].colonies);
    // Her colonies join the list new nutrients keep clear of, which starts
    // with the disks.
    expect(options.avoid).toEqual(playMold.mock.calls[0][3]);
  });

  it('gives a mold one more disk than a yeast gets on the same level', async () => {
    const disks = () => document.querySelectorAll('.antifungal').length;
    await openMold('?pal=fumi&level=1');
    expect(disks()).toBe(LEVELS[0].moldDisks);
    await openMold('?pal=fumi&level=4');
    expect(disks()).toBe(LEVELS[3].moldDisks);
    await open('?pal=sasha&level=4');
    expect(disks()).toBe(LEVELS[3].disks);
  });

  it('puts out fewer nutrients for a mold than for a yeast', async () => {
    const flecks = () => document.querySelectorAll('.nutrient').length;
    await openMold('?pal=fumi');
    expect(flecks()).toBeLessThanOrEqual(GAME.MOLD_NUTRIENTS);
    expect(flecks()).toBeGreaterThan(0);
    await open('?pal=sasha');
    expect(flecks()).toBeGreaterThan(GAME.MOLD_NUTRIENTS);
  });

  it('shows the mold directions, and the yeast ones for a yeast', async () => {
    const shown = () => [...document.querySelectorAll('.how-to-play')]
      .filter((p) => !p.hidden).map((p) => p.classList.contains('for-mold'));
    await openMold('?pal=fumi');
    expect(shown()).toEqual([true]);
    await open('?pal=sasha');
    expect(shown()).toEqual([false]);
  });
});

describe('picking the level', () => {
  // The level and cell target the game was started with.
  async function startedAt(search) {
    const playGame = await open(search);
    return playGame.mock.calls[0][4];
  }

  it('starts at level 1 when the address has no level', async () => {
    expect(await startedAt('?pal=sasha')).toEqual({ level: 1, target: LEVELS[0].target });
  });

  it.each(LEVELS.map((level, i) => [i + 1, level]))(
    'level %i uses its own cell target and number of disks',
    async (n, level) => {
      expect(await startedAt(`?pal=sasha&level=${n}`)).toEqual({ level: n, target: level.target });
      expect(document.querySelectorAll('.agar .antifungal')).toHaveLength(level.disks);
    },
  );

  it.each([
    ['too high', '99', LEVELS.length],
    ['zero', '0', 1],
    ['negative', '-3', 1],
    ['not a number', 'abc', 1],
    ['empty', '', 1],
    ['a decimal', '2.7', 2],
  ])('a level that is %s ("%s") becomes level %i', async (_, value, expected) => {
    const { level } = await startedAt(`?pal=sasha&level=${value}`);
    expect(level).toBe(expected);
  });
});

describe('a broken address', () => {
  it.each([
    ['no pal', ''],
    ['an unknown pal', '?pal=bogus'],
    ['a pal with the wrong capitals', '?pal=Sasha'],
  ])('with %s, sends them back to pick a pal instead of starting', async (_, search) => {
    const playGame = await open(search);
    expect(location.replace).toHaveBeenCalledWith('./pal-picker.html');
    expect(playGame).not.toHaveBeenCalled();
    expect(document.querySelectorAll('.dish-pal:not([hidden])')).toHaveLength(0);
  });

  it('with a mangled pal name, still sends them back instead of crashing', async () => {
    // A stray quote or bracket once broke the page before it could redirect.
    const playGame = await open('?pal=sasha"]');
    expect(location.replace).toHaveBeenCalledWith('./pal-picker.html');
    expect(playGame).not.toHaveBeenCalled();
  });
});

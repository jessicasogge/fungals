// Checks that the game's settings in config.js are complete and sensible.
// (The pals' names and drawings are checked in pals.test.js.)
import { describe, expect, it } from 'vitest';
import { GAME, LEVELS, SPECIES } from '../public/game/config.js';

const PALS = Object.keys(SPECIES);

// How readable one color is on another (WCAG contrast ratio, 1 to 21).
function contrast(a, b) {
  const luminance = (hex) => {
    const [r, g, b2] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b2);
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('pals', () => {
  it('keys every pal by a short lowercase id, used in addresses like ?pal=sasha', () => {
    expect(PALS.length).toBeGreaterThan(1);
    for (const pal of PALS) expect(pal).toMatch(/^[a-z]+$/);
  });

  it.each(PALS)('%s is a yeast, with colors for her daughter cells', (pal) => {
    const species = SPECIES[pal];
    expect(species.kind).toBe('yeast');
    for (const part of ['fill', 'stroke', 'highlight', 'dark']) {
      expect(species.colors[part]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('names above the dish', () => {
  it.each(PALS)("writes %s's species the scientific way: Genus species", (pal) => {
    expect(SPECIES[pal].scientific).toMatch(/^[A-Z][a-z]+ [a-z]+$/);
  });

  it.each(PALS)("colors %s's name so it's easy to read on the page", (pal) => {
    expect(SPECIES[pal].color).toMatch(/^#[0-9a-f]{6}$/i);
    // The page behind the title is a soft purple (#e6dcf8). 3:1 is the
    // standard minimum for large, bold text like her name.
    expect(contrast(SPECIES[pal].color, '#e6dcf8')).toBeGreaterThanOrEqual(3);
  });

  it('gives every pal her own name color', () => {
    const colors = PALS.map((pal) => SPECIES[pal].color.toLowerCase());
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe('levels', () => {
  it('get harder every level: one more disk and a bigger colony to grow', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].disks).toBe(LEVELS[i - 1].disks + 1);
      expect(LEVELS[i].target).toBeGreaterThan(LEVELS[i - 1].target);
    }
  });

  it('start with one disk and a small colony', () => {
    expect(LEVELS[0]).toEqual({ disks: 1, target: 4 });
  });

  it('go up to a colony of 256 cells past seven disks, doubling each level', () => {
    expect(LEVELS).toHaveLength(7);
    expect(LEVELS.at(-1)).toEqual({ disks: 7, target: 256 });
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i].target).toBe(LEVELS[i - 1].target * 2);
  });
});

describe('game settings', () => {
  it('are all positive numbers', () => {
    for (const [name, value] of Object.entries(GAME)) {
      expect(typeof value, name).toBe('number');
      expect(value, name).toBeGreaterThan(0);
    }
  });

  it('keep the disks inside the dish and clear of where the pal starts', () => {
    expect(GAME.DISK_MIN_DISTANCE).toBeLessThan(GAME.DISK_MAX_DISTANCE);
    // The farthest disk, buffer and all, still sits inside the rim.
    expect(GAME.DISK_MAX_DISTANCE + GAME.DISK_RADIUS + GAME.ZONE_MAX_WIDTH).toBeLessThan(1);
  });

  it('let a cluster hold at least a few cells', () => {
    expect(Number.isInteger(GAME.GROUP_CAP)).toBe(true);
    expect(GAME.GROUP_CAP).toBeGreaterThanOrEqual(4);
  });
});

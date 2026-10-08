// @vitest-environment jsdom
// placeAntifungals adds the disks to the page, so these tests run in jsdom,
// a simulated browser page.
import { beforeEach, describe, expect, it } from 'vitest';
import { placeAntifungals } from '../public/game/antifungal.js';
import { antifungalsFor } from '../public/game/antifungal.js';
import { GAME, LEVELS, SPECIES } from '../public/game/config.js';

beforeEach(() => {
  document.body.innerHTML = '<div class="agar"></div>';
});

describe("a mold's disks", () => {
  it('all have zones: no drug she shrugs off', () => {
    for (const drug of SPECIES.fumi.antifungals) expect(drug.zone, drug.code).toBeGreaterThan(0);
  });

  it('all fit on the dish, even the 8 on the last level, a little nearer the rim', () => {
    const count = LEVELS.at(-1).moldDisks;
    for (let i = 0; i < 100; i++) {
      document.body.innerHTML = '<div class="agar"></div>';
      const disks = placeAntifungals(antifungalsFor(SPECIES.fumi.antifungals, count),
        { maxDistance: GAME.MOLD_DISK_MAX_DISTANCE });
      expect(disks).toHaveLength(count);
      for (const d of disks) expect(Math.hypot(d.fx, d.fy)).toBeLessThanOrEqual(GAME.MOLD_DISK_MAX_DISTANCE + 1e-9);
    }
  });
});

describe('placing the disks', () => {
  it('puts one disk per antifungal on the agar, labeled with its code', () => {
    const disks = placeAntifungals(SPECIES.candi.antifungals.slice(0, 3));
    const els = [...document.querySelectorAll('.agar .antifungal')];
    expect(els).toHaveLength(3);
    expect(els.map((el) => el.textContent)).toEqual(['FLC', 'NY', 'VOR']);
    expect(disks.map((d) => d.el)).toEqual(els);
  });

  it('names the antifungal for the hover label, starting with a capital letter', () => {
    placeAntifungals([{ code: 'FLC', name: 'fluconazole' }, { code: 'AMB', name: 'amphotericin B' }]);
    const names = [...document.querySelectorAll('.antifungal')].map((el) => el.dataset.name);
    expect(names).toEqual(['Fluconazole', 'Amphotericin B']);
  });

  it("doesn't also show the browser's own slow tooltip", () => {
    placeAntifungals([{ code: 'FLC', name: 'fluconazole' }]);
    expect(document.querySelector('.antifungal').hasAttribute('title')).toBe(false);
  });

  it('tells screen readers what the disk is', () => {
    placeAntifungals([{ code: 'NY', name: 'nystatin' }]);
    expect(document.querySelector('.antifungal').getAttribute('aria-label')).toMatch(/nystatin/);
  });
});

describe("a disk for a drug she's resistant to", () => {
  it("tells screen readers there's no clear zone, but the disk still counts", () => {
    placeAntifungals([{ code: 'FLC', name: 'fluconazole', zone: null }]);
    expect(document.querySelector('.antifungal').getAttribute('aria-label'))
      .toBe("Antifungal disk: fluconazole. No clear zone (resistant), but don't touch the disk!");
  });
});

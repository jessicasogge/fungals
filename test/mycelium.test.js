// @vitest-environment jsdom
// mycelium.js draws Fumi's threads: wavy and fuzzy, with a wall at every
// cell, and gray where a tip died. These run in jsdom, a simulated browser
// page, with a stand-in for the canvas.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GAME, SPECIES } from '../public/game/config.js';
import { makeMold } from '../public/game/mold.js';
import { distances, drawMycelium, hairs, myceliumCanvas, walls, wavy } from '../public/game/mycelium.js';

const M = GAME.MOLD;
const straight = (n, step = 0.012) => Array.from({ length: n }, (_, i) => [i * step, 0]);

afterEach(() => vi.restoreAllMocks());

describe('the thread drawing', () => {
  it('measures how far along a thread each point is', () => {
    expect(distances([[0, 0], [3, 4], [3, 5]])).toEqual([0, 5, 6]);
  });

  it('wiggles a straight thread, but not at its two ends', () => {
    const line = straight(60);
    const drawn = wavy(line, 0);
    expect(drawn[0]).toEqual([0, 0]);
    expect(drawn.at(-1)[1]).toBeCloseTo(0, 9);
    expect(drawn.some(([, y]) => Math.abs(y) > M.WAVE / 2)).toBe(true);
    expect(drawn.every(([, y]) => Math.abs(y) <= M.WAVE + 1e-9)).toBe(true);
  });

  it('draws the same wiggles every time, and different ones for each thread', () => {
    const line = straight(60);
    expect(wavy(line, 1)).toEqual(wavy(line, 1));
    expect(wavy(line, 1)).not.toEqual(wavy(line, 2));
  });

  it('copes with a thread that has no length yet', () => {
    expect(wavy([[0.1, 0.1], [0.1, 0.1]], 0)).toEqual([[0.1, 0.1], [0.1, 0.1]]);
  });

  it('puts fine hairs along both sides, none at the growing tip', () => {
    const line = straight(60);
    const found = hairs(line, 0);
    expect(found.length).toBeGreaterThan(10);
    expect(found.some(([[, y]]) => y > 0)).toBe(true);
    expect(found.some(([[, y]]) => y < 0)).toBe(true);
    const end = line.at(-1)[0];
    expect(found.every(([[x]]) => x < end - M.WIDTH)).toBe(true);
    expect(hairs(line, 0)).toEqual(found);
  });

  it('puts a wall at every cell along a thread', () => {
    const line = straight(30); // 0.348 long
    const found = walls(line, distances(line), 0.348);
    expect(found).toHaveLength(Math.floor(0.348 / M.CELL_LENGTH));
    found.forEach(([x, y, angle], i) => {
      expect(x).toBeCloseTo((i + 1) * M.CELL_LENGTH, 9);
      expect(y).toBe(0);
      expect(angle).toBe(0);
    });
    expect(walls(line, distances(line), 0.05)).toEqual([]);
  });

  it('keeps a wall on the thread even if it reaches past the last point', () => {
    const line = [[0, 0], [0.05, 0]];
    expect(walls(line, distances(line), M.CELL_LENGTH)).toEqual([[0.05, 0, 0]]);
    const still = [[0, 0], [0, 0]];
    expect(walls(still, distances(still), M.CELL_LENGTH)).toEqual([[0, 0, 0]]);
  });
});

describe('the canvas', () => {
  // A stand-in for a canvas's 2D drawing, which jsdom doesn't have.
  function fakeContext() {
    const calls = [];
    const ctx = new Proxy({}, {
      get(target, name) {
        if (name in target) return target[name];
        return (...args) => calls.push([name, ...args]);
      },
      set(target, name, value) {
        target[name] = value;
        calls.push([`set ${String(name)}`, value]);
        return true;
      },
    });
    return { ctx, calls };
  }

  function dish() {
    document.body.innerHTML = '<div class="agar"><div class="pal-mover"></div></div>';
    const agar = document.querySelector('.agar');
    Object.defineProperty(agar, 'clientWidth', { configurable: true, value: 400 });
    return agar;
  }

  it('goes under everything else on the agar, hidden from screen readers', () => {
    const agar = dish();
    const canvas = myceliumCanvas(agar);
    expect(agar.firstElementChild).toBe(canvas);
    expect(canvas.className).toBe('mycelium');
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws each thread fuzzy, then its tube and core, its walls, and a bud or a gray dot at each branch tip', () => {
    const agar = dish();
    const canvas = myceliumCanvas(agar);
    const { ctx, calls } = fakeContext();
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx);
    const mold = makeMold({ angle: 0 });
    mold.growth = 10;
    for (let i = 0; i < 40; i++) mold.update(0.02, 0);
    const branch = mold.branch();
    for (let i = 0; i < 20; i++) mold.update(0.02, 0);
    mold.kill(branch);
    for (let i = 0; i < 20; i++) mold.update(0.02, 0);
    mold.branch(); // a new bud, not grown yet
    drawMycelium(canvas, agar, mold, SPECIES.fumi.colors);
    expect(canvas.width).toBe(400 * Math.min(2, window.devicePixelRatio || 1));
    // three threads: a haze, hairs, a tube and a core each; then all the
    // walls, then the live bud's outline
    expect(calls.filter(([name]) => name === 'stroke')).toHaveLength(14);
    expect(calls.filter(([name]) => name === 'quadraticCurveTo').length).toBeGreaterThan(0);
    const styles = calls.filter(([name]) => name === 'set strokeStyle').map(([, v]) => v);
    expect(styles).toContain(SPECIES.fumi.colors.fill);
    expect(styles).toContain('#e5e7eb'); // the dead branch's core
    expect(calls.filter(([name]) => name === 'fill')).toHaveLength(2); // the dead tip and the new bud
    const fills = calls.filter(([name]) => name === 'set fillStyle').map(([, v]) => v);
    expect(fills).toEqual(['#9ca3af', SPECIES.fumi.colors.fill]);
    calls.length = 0;
    drawMycelium(canvas, agar, mold, SPECIES.fumi.colors); // same size: no resize
    expect(calls.filter(([name]) => name === 'set width')).toHaveLength(0);
  });

  it('skips drawing where there is no canvas to draw on', () => {
    const agar = dish();
    const canvas = myceliumCanvas(agar);
    vi.spyOn(canvas, 'getContext').mockImplementation(() => {
      throw new Error('no canvas here');
    });
    expect(() => drawMycelium(canvas, agar, makeMold(), SPECIES.fumi.colors)).not.toThrow();
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);
    expect(() => drawMycelium(canvas, agar, makeMold(), SPECIES.fumi.colors)).not.toThrow();
  });
});

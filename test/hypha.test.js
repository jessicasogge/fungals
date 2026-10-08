// @vitest-environment jsdom
// hypha.js: a mold (Fumi) swims like the yeasts but leaves a thread behind
// her. Each nutrient puts a wall across the thread (one more cell) and
// sprouts a branch. These run in jsdom, a simulated browser page.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME, SPECIES } from '../public/game/config.js';
import { hyphaGroup, threadLayer } from '../public/game/hypha.js';

// jsdom doesn't lay anything out; give the agar a fixed width.
const DISH = 400;
const RADIUS = DISH / 2;
let saved;
let agar;
beforeEach(() => {
  document.body.innerHTML = '<div class="agar"></div>';
  agar = document.querySelector('.agar');
  saved = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return this.classList.contains('agar') ? DISH : 0;
    },
  });
});
afterEach(() => {
  if (saved) Object.defineProperty(HTMLElement.prototype, 'clientWidth', saved);
  else delete HTMLElement.prototype.clientWidth;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// Fumi (or a branch) in the dish, starting at `start`, heading `angle`.
function makeTip({ isPlayer = true, start, angle = 0 } = {}) {
  const mover = document.createElement('div');
  mover.className = 'pal-mover';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mover.append(svg);
  agar.append(mover);
  return hyphaGroup({ mover, svg, species: SPECIES.fumi, isPlayer, start, angle });
}

// Swim the player to (fx, fy), in fractions of the dish radius, the way
// game.js moves her, then let her thread follow.
function swimTo(tip, fx, fy) {
  [tip.x, tip.y] = [fx * RADIUS, fy * RADIUS];
  tip.update(0.016);
}

const close = (a, b) => expect(a).toBeCloseTo(b, 5);

describe('Fumi', () => {
  it('starts as one cell, the spore, where she landed', () => {
    const tip = makeTip({ start: [0.1, -0.2] });
    expect(tip.cellCount()).toBe(1);
    expect([tip.x, tip.y]).toEqual([0.1 * RADIUS, -0.2 * RADIUS]);
  });

  it('has her face on her tip; a branch tip is just a rounded end', () => {
    const tip = makeTip();
    expect(tip.svg.querySelectorAll('circle')).toHaveLength(3); // the tip and two eyes
    expect(tip.svg.querySelector('path')).not.toBeNull(); // her smile
    expect(tip.svg.style.animation).toBe('none'); // she stays on the end of her thread
    const branch = makeTip({ isPlayer: false });
    expect(branch.svg.querySelectorAll('circle')).toHaveLength(1);
    expect(branch.svg.querySelector('path')).toBeNull();
  });

  it('is sized from the settings: her tip, or a thread\'s width for a branch', () => {
    expect(makeTip().mover.style.width).toBe(`${GAME.TIP_SIZE * 50}%`);
    expect(makeTip({ isPlayer: false }).mover.style.width).toBe(`${GAME.HYPHA_WIDTH * 50}%`);
  });

  it('leaves a thread behind her wherever she swims', () => {
    const tip = makeTip();
    swimTo(tip, 0.2, 0);
    swimTo(tip, 0.4, 0);
    expect(tip.path).toEqual([[0, 0], [0.2, 0], [0.4, 0]]);
    close(tip.angle, 0);
  });

  it("doesn't add a point for every tiny move, and stays put when she does", () => {
    const tip = makeTip();
    swimTo(tip, GAME.HYPHA_POINT / 2, 0);
    expect(tip.path).toHaveLength(1);
    expect(tip.tip).toEqual([GAME.HYPHA_POINT / 2, 0]);
    const angle = tip.angle;
    swimTo(tip, GAME.HYPHA_POINT / 2, 0);
    expect(tip.angle).toBe(angle);
  });

  it("turns in a curve, never a sharp corner", () => {
    const tip = makeTip();
    swimTo(tip, 0.2, 0); // her first move can go any way
    expect(tip.tip).toEqual([0.2, 0]);
    // steered straight down: she bends only a little per step
    const step = 0.01;
    swimTo(tip, 0.2, step);
    close(tip.angle, step / GAME.HYPHA_TURN);
    close(Math.hypot(tip.tip[0] - 0.2, tip.tip[1]), step); // same distance, bent path
    close(tip.x, tip.tip[0] * RADIUS);
    // keep steering down and she comes around to heading down
    for (let i = 0; i < 60; i++) swimTo(tip, tip.tip[0], tip.tip[1] + step);
    close(tip.angle, Math.PI / 2);
    // every bend along her thread stays gentle
    const p = tip.path;
    for (let i = 2; i < p.length; i++) {
      const a = Math.atan2(p[i - 1][1] - p[i - 2][1], p[i - 1][0] - p[i - 2][0]);
      const b = Math.atan2(p[i][1] - p[i - 1][1], p[i][0] - p[i - 1][0]);
      expect(Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)))).toBeLessThan(0.5);
    }
  });

  it('stays inside the rim even when her curve would carry her past it', () => {
    const rim = 1 - GAME.TIP_SIZE / 2;
    const tip = makeTip({ start: [rim - 0.05, 0] });
    swimTo(tip, rim - 0.05, -0.05); // heading up, along the rim
    swimTo(tip, rim + 0.1, -0.05); // steered hard outward
    expect(Math.hypot(...tip.tip)).toBeCloseTo(rim, 5);
    expect(Math.hypot(tip.x, tip.y) / RADIUS).toBeCloseTo(rim, 5);
  });

  it("doesn't get more cells just by swimming", () => {
    const tip = makeTip();
    swimTo(tip, 0.5, 0);
    swimTo(tip, 0.5, 0.5);
    expect(tip.cellCount()).toBe(1);
  });

  it('is kept in the dish like a yeast, by the size of her tip', () => {
    expect(makeTip().reach()).toBe((GAME.TIP_SIZE / 2) * RADIUS);
    expect(makeTip({ isPlayer: false }).reach()).toBe(0);
  });

  it('is placed where she is, and threads never slide', () => {
    const tip = makeTip({ start: [0.25, 0.5] });
    tip.place();
    expect(tip.mover.style.transform).toBe('translate(50px, 100px)');
    tip.coast(1);
    expect([tip.x, tip.y]).toEqual([50, 100]);
  });

  it('touches nutrients and zones with just her tip', () => {
    expect(makeTip({ start: [0.5, 0] }).body()).toEqual([[100, 0, (GAME.TIP_SIZE / 2) * RADIUS]]);
    expect(makeTip({ isPlayer: false, start: [0.5, 0] }).body()).toEqual([[100, 0, (GAME.HYPHA_WIDTH / 2) * RADIUS]]);
  });
});

describe('eating', () => {
  it('puts a wall across her thread right where she ate: one more cell', () => {
    const tip = makeTip();
    swimTo(tip, 0.3, 0);
    tip.divide();
    expect(tip.cellCount()).toBe(2);
    expect(tip.walls).toEqual([[0.3, 0, 0]]);
  });

  it('shows no "+1" when she eats', () => {
    const tip = makeTip();
    swimTo(tip, 0.3, 0);
    tip.divide();
    expect(agar.querySelector('.cell-plus')).toBeNull();
  });

  it('sprouts a branch from that spot, about 45 degrees off her line, on alternating sides', () => {
    const tip = makeTip();
    swimTo(tip, 0.3, 0);
    const a = tip.divide();
    const b = tip.divide();
    expect(a.isPlayer).toBe(false);
    expect(a.mover.parentElement).toBe(agar);
    expect(a.mover.classList.contains('offspring')).toBe(true);
    expect(a.path[0]).toEqual([0.3, 0]);
    close(Math.abs(a.angle), GAME.BRANCH_ANGLE);
    close(a.angle, -b.angle);
    expect(a.cellCount()).toBe(0); // the wall was the new cell
  });
});

describe('a branch', () => {
  it('grows a short way on its own, then stops', () => {
    const branch = makeTip({ isPlayer: false, angle: 0 });
    branch.update(0.5);
    close(branch.tip[0], GAME.BRANCH_SPEED * 0.5);
    close(branch.x, GAME.BRANCH_SPEED * 0.5 * RADIUS);
    for (let i = 0; i < 100; i++) branch.update(0.1);
    close(branch.tip[0], GAME.BRANCH_LENGTH);
  });

  it("doesn't grow on a frame with no time in it", () => {
    const branch = makeTip({ isPlayer: false });
    branch.update(0);
    expect(branch.tip).toEqual([0, 0]);
  });

  it('gets a wall when it eats, but no branch of its own', () => {
    const branch = makeTip({ isPlayer: false, angle: 0 });
    branch.update(0.5);
    expect(branch.divide()).toBeNull();
    expect(branch.cellCount()).toBe(1);
    expect(branch.walls).toHaveLength(1);
  });

  it('stops at the rim', () => {
    const branch = makeTip({ isPlayer: false, start: [GAME.HYPHA_RIM - 0.001, 0], angle: 0 });
    branch.update(0.5);
    expect(branch.stopped).toBe(true);
    branch.update(0.5);
    expect(branch.tip).toEqual([GAME.HYPHA_RIM - 0.001, 0]);
  });

  it('stops where it grows into a zone, grays its tip, and leaves nothing to touch', () => {
    const branch = makeTip({ isPlayer: false, angle: 0 });
    branch.update(0.5);
    branch.stopInZone();
    expect(branch.mover.classList.contains('stopped')).toBe(true);
    expect(branch.body()).toEqual([]);
    const tip = [...branch.tip];
    branch.update(1);
    expect(branch.tip).toEqual(tip);
  });

  it('stops growing when the level ends', () => {
    const tip = makeTip();
    const branch = tip.divide();
    tip.freeze();
    branch.update(1);
    expect(branch.tip).toEqual([0, 0]);
  });
});

describe('the thread layer', () => {
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

  it('is one canvas per dish, underneath everything else, hidden from screen readers', () => {
    makeTip();
    makeTip({ isPlayer: false });
    const canvases = agar.querySelectorAll('canvas.mycelium');
    expect(canvases).toHaveLength(1);
    expect(agar.firstElementChild).toBe(canvases[0]);
    expect(canvases[0].getAttribute('aria-hidden')).toBe('true');
    expect(threadLayer(agar, SPECIES.fumi.colors).canvas).toBe(canvases[0]);
  });

  it('draws every thread, its core, and a bar for each wall as she swims', () => {
    const { ctx, calls } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    const tip = makeTip();
    swimTo(tip, 0.3, 0);
    tip.divide();
    const branch = tip.divide();
    branch.update(0.5);
    branch.stopInZone();
    calls.length = 0;
    swimTo(tip, 0.3, 0.1);
    const canvas = agar.querySelector('canvas');
    expect(canvas.width).toBe(DISH * Math.min(2, window.devicePixelRatio || 1));
    // three threads (hers and two branches): for each, a haze, its hairs, a
    // tube and a core; then two walls
    expect(calls.filter(([name]) => name === 'stroke')).toHaveLength(14);
    expect(calls.some(([name]) => name === 'quadraticCurveTo')).toBe(true); // curves, not straight bits
    const styles = calls.filter(([name]) => name === 'set strokeStyle').map(([, v]) => v);
    expect(styles).toContain(SPECIES.fumi.colors.stroke);
    expect(styles).toContain(SPECIES.fumi.colors.fill);
    expect(styles).toContain('#e5e7eb'); // the stopped branch's core, grayed
  });

  it('draws a wavy, fuzzy thread that holds still from frame to frame', () => {
    const { ctx, calls } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    const tip = makeTip();
    for (let i = 1; i <= 40; i++) swimTo(tip, i * 0.015, 0);
    calls.length = 0;
    swimTo(tip, 40 * 0.015, 0);
    const drawn = () => calls.filter(([name]) => name === 'quadraticCurveTo').map((c) => c.slice(1));
    const hairs = () => calls.filter(([name]) => name === 'moveTo').length;
    const first = drawn();
    const firstHairs = hairs();
    // her path is a straight line along y = 0, but the drawing wiggles off it
    expect(first.some(([, y]) => Math.abs(y - RADIUS) > 1)).toBe(true);
    expect(firstHairs).toBeGreaterThan(5);
    calls.length = 0;
    swimTo(tip, 40 * 0.015, 0); // same spot again
    expect(drawn()).toEqual(first);
    expect(hairs()).toBe(firstHairs);
  });

  it('skips drawing where there is no canvas to draw on', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('no canvas here');
    });
    const tip = makeTip();
    expect(() => swimTo(tip, 0.1, 0)).not.toThrow();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(() => swimTo(tip, 0.2, 0)).not.toThrow();
  });

  it("doesn't follow her before the dish has a size", () => {
    const tip = makeTip();
    Object.defineProperty(agar, 'clientWidth', { configurable: true, value: 0 });
    tip.update(0.1);
    expect(tip.path).toEqual([[0, 0]]);
  });
});

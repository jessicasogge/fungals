// @vitest-environment jsdom
// hypha.js: a mold (Fumi) grows threads from a tip you steer, walls form
// along them (each walled compartment is a cell), and eating sprouts
// branches. These run in jsdom, a simulated browser page.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME, SPECIES } from '../public/game/config.js';
import { hyphaGroup, septa, threadLayer } from '../public/game/hypha.js';

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
});

// Fumi's tip (or a branch) in the dish, heading `angle` from `start`.
function makeTip({ isPlayer = true, start, angle = 0 } = {}) {
  const mover = document.createElement('div');
  mover.className = 'pal-mover';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mover.append(svg);
  agar.append(mover);
  return hyphaGroup({ mover, svg, species: SPECIES.fumi, isPlayer, start, angle });
}

const close = (a, b) => expect(a).toBeCloseTo(b, 5);

describe('her tip', () => {
  it('starts as one cell where the spore landed', () => {
    const tip = makeTip({ start: [0.1, -0.2] });
    expect(tip.cellCount()).toBe(1);
    expect([tip.x, tip.y]).toEqual([0.1 * RADIUS, -0.2 * RADIUS]);
  });

  it('has her face; a branch tip is just a rounded end', () => {
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

  it('keeps growing forward on her own, at a steady pace', () => {
    const tip = makeTip({ angle: 0 });
    tip.update(1);
    close(tip.tip[0], GAME.HYPHA_SPEED);
    close(tip.tip[1], 0);
    close(tip.x, GAME.HYPHA_SPEED * RADIUS);
    close(tip.length, GAME.HYPHA_SPEED);
  });

  it('adds a cell each time her thread grows another wall\'s length', () => {
    const tip = makeTip({ angle: 0 });
    const frames = Math.ceil(GAME.SEPTUM / GAME.HYPHA_SPEED / 0.05);
    for (let i = 0; i < frames; i++) tip.update(0.05);
    expect(tip.cellCount()).toBe(2);
    expect(tip.path.length).toBeGreaterThan(2); // points along the way, for drawing
  });

  it("doesn't grow on a frame with no time in it", () => {
    const tip = makeTip();
    tip.update(0);
    expect(tip.length).toBe(0);
  });

  it('follows the dish when it changes size', () => {
    const tip = makeTip({ start: [0.5, 0] });
    Object.defineProperty(agar, 'clientWidth', { configurable: true, value: 200 });
    tip.update(0);
    expect(tip.x).toBe(50);
  });

  it('is placed where she is, and is never pushed by anything', () => {
    const tip = makeTip({ start: [0.25, 0.5] });
    tip.place();
    expect(tip.mover.style.transform).toBe('translate(50px, 100px)');
    expect(tip.reach()).toBe(0);
    tip.coast(1); // threads don't slide
    expect([tip.x, tip.y]).toEqual([50, 100]);
  });

  it('touches nutrients and zones with just her tip', () => {
    const tip = makeTip({ start: [0.5, 0] });
    expect(tip.body()).toEqual([[100, 0, (GAME.TIP_SIZE / 2) * RADIUS]]);
    const branch = makeTip({ isPlayer: false, start: [0.5, 0] });
    expect(branch.body()).toEqual([[100, 0, (GAME.HYPHA_WIDTH / 2) * RADIUS]]);
  });
});

describe('steering', () => {
  it('turns toward the arrow keys, no faster than her turning speed', () => {
    const tip = makeTip({ angle: 0 });
    tip.steer([0, 1], null); // down
    tip.update(0.1);
    close(tip.angle, GAME.HYPHA_TURN * 0.1);
    tip.update(1); // long enough to finish turning, short of the rim
    close(tip.angle, Math.PI / 2);
  });

  it('turns the short way round', () => {
    const tip = makeTip({ angle: 0.1 });
    tip.steer([0, -1], null); // up
    tip.update(0.1);
    expect(tip.angle).toBeLessThan(0.1);
  });

  it('keeps growing straight when nothing is steering', () => {
    const tip = makeTip({ angle: 1 });
    tip.steer([0, 0], null);
    tip.update(0.5);
    expect(tip.angle).toBe(1);
  });

  it('turns the way a finger drags', () => {
    const tip = makeTip({ angle: 0 });
    tip.steer([0, 0], [500, 500], [-10, 0]); // dragging left wins over where the finger is
    expect(tip.want).toBeCloseTo(Math.PI);
  });

  it('turns toward a mouse held on the dish', () => {
    const tip = makeTip({ start: [0, 0], angle: 0 });
    tip.steer([0, 0], [0, -50]);
    expect(tip.want).toBeCloseTo(-Math.PI / 2);
  });
});

describe('the rim', () => {
  it('turns her along the rim instead of through it', () => {
    const tip = makeTip({ start: [GAME.HYPHA_RIM - 0.01, 0], angle: 0 });
    tip.update(0.2);
    expect(Math.hypot(...tip.tip)).toBeLessThanOrEqual(GAME.HYPHA_RIM + 1e-9);
    close(Math.abs(Math.sin(tip.angle)), 1); // now heading along it
    tip.update(0.2);
    expect(tip.length).toBeGreaterThan(0.04); // and still growing
  });

  it('turns her either way, whichever side she was already heading', () => {
    const up = makeTip({ start: [GAME.HYPHA_RIM - 0.01, 0], angle: -0.3 });
    up.update(0.2);
    expect(up.angle).toBeLessThan(0);
    const down = makeTip({ start: [GAME.HYPHA_RIM - 0.01, 0], angle: 0.3 });
    down.update(0.2);
    expect(down.angle).toBeGreaterThan(0);
  });

  it('stops a branch', () => {
    const branch = makeTip({ isPlayer: false, start: [GAME.HYPHA_RIM - 0.001, 0], angle: 0 });
    branch.update(0.5);
    expect(branch.stopped).toBe(true);
    const length = branch.length;
    branch.update(0.5);
    expect(branch.length).toBe(length);
  });
});

describe('branching', () => {
  it('sprouts a branch behind her tip when she eats, about 45 degrees off her line', () => {
    const tip = makeTip({ angle: 0 });
    for (let i = 0; i < 20; i++) tip.update(0.05);
    const branch = tip.divide();
    expect(branch.isPlayer).toBe(false);
    expect(branch.mover.parentElement).toBe(agar);
    expect(branch.mover.classList.contains('offspring')).toBe(true);
    expect(branch.path[0]).toEqual(tip.path[tip.path.length - 3]);
    close(Math.abs(branch.angle), GAME.BRANCH_ANGLE);
    expect(branch.cellCount()).toBe(1); // a new branch is a new cell
  });

  it('branches on alternating sides', () => {
    const tip = makeTip({ angle: 0 });
    const a = tip.divide();
    const b = tip.divide();
    close(a.angle, -b.angle);
  });

  it('grows a branch a short way on its own, then it stops', () => {
    const branch = makeTip({ isPlayer: false, angle: 0 });
    branch.update(0.5);
    close(branch.length, GAME.BRANCH_SPEED * 0.5);
    for (let i = 0; i < 100; i++) branch.update(0.1);
    close(branch.length, GAME.BRANCH_LENGTH);
  });

  it('lets a branch that eats grow farther, and branch too', () => {
    const branch = makeTip({ isPlayer: false, angle: 0 });
    for (let i = 0; i < 100; i++) branch.update(0.1); // all grown out
    const sprout = branch.divide();
    expect(sprout.isPlayer).toBe(false);
    for (let i = 0; i < 100; i++) branch.update(0.1);
    close(branch.length, GAME.BRANCH_LENGTH * 1.5);
  });
});

describe('antifungal zones', () => {
  it('stop a branch where it touches, gray its tip, and leave nothing to touch', () => {
    const branch = makeTip({ isPlayer: false, angle: 0 });
    branch.update(0.5);
    branch.stopInZone();
    expect(branch.mover.classList.contains('stopped')).toBe(true);
    expect(branch.body()).toEqual([]);
    const length = branch.length;
    branch.update(1);
    expect(branch.length).toBe(length);
  });
});

describe('the end of a level', () => {
  it('stops every thread growing', () => {
    const tip = makeTip({ angle: 0 });
    const branch = tip.divide();
    tip.freeze();
    tip.update(1);
    branch.update(1);
    expect(tip.length).toBe(0);
    expect(branch.length).toBe(0);
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

  it("draws every thread, its core, and its walls each time her tip moves", () => {
    const { ctx, calls } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    const tip = makeTip({ angle: 0 });
    for (let i = 0; i < 20; i++) tip.update(0.05);
    const branch = tip.divide();
    branch.update(0.5);
    branch.stopInZone();
    calls.length = 0;
    tip.update(0.05);
    const canvas = agar.querySelector('canvas');
    expect(canvas.width).toBe(DISH * Math.min(2, window.devicePixelRatio || 1));
    expect(calls.filter(([name]) => name === 'stroke').length).toBeGreaterThan(4);
    const styles = calls.filter(([name]) => name === 'set strokeStyle').map(([, v]) => v);
    expect(styles).toContain(SPECIES.fumi.colors.stroke); // the tube and the walls
    expect(styles).toContain(SPECIES.fumi.colors.fill); // her thread's core
    expect(styles).toContain('#e5e7eb'); // the stopped branch's core, grayed
  });

  it('skips drawing where there is no canvas to draw on', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('no canvas here');
    });
    const tip = makeTip();
    expect(() => tip.update(0.1)).not.toThrow();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(() => tip.update(0.1)).not.toThrow();
  });
});

describe('septa', () => {
  it('puts a wall every SEPTUM along a thread, across it', () => {
    const walls = septa([[0, 0], [GAME.SEPTUM * 2.5, 0]]);
    expect(walls).toHaveLength(2);
    close(walls[0][0], GAME.SEPTUM);
    close(walls[1][0], GAME.SEPTUM * 2);
    // across a thread running along x is straight up and down
    close(walls[0][2], 0);
    close(Math.abs(walls[0][3]), 1);
  });

  it('measures along bends and skips repeated points', () => {
    const walls = septa([[0, 0], [GAME.SEPTUM * 0.6, 0], [GAME.SEPTUM * 0.6, 0], [GAME.SEPTUM * 0.6, GAME.SEPTUM * 0.6]]);
    expect(walls).toHaveLength(1);
    close(walls[0][0], GAME.SEPTUM * 0.6);
    close(walls[0][1], GAME.SEPTUM * 0.4);
  });

  it('has none on a thread shorter than one wall', () => {
    expect(septa([[0, 0], [GAME.SEPTUM / 2, 0]])).toEqual([]);
  });
});

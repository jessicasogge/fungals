// @vitest-environment jsdom
// mold-game.js runs a level as Fumi: her tips grow, she branches with Space
// or the Branch button, nutrients touching her feed her, a tip that touches
// an antifungal dies, and the game ends when she's big enough or every tip
// is dead. These load the real petri dish page into jsdom and use the real
// mold, with stand-ins for steering, drawing and effects.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME, LEVELS, SPECIES } from '../public/game/config.js';

const fake = vi.hoisted(() => ({ mold: null, direction: [0, 0], hit: () => null, drag: [0, 0], target: null }));

vi.mock('../public/game/mold.js', async (importActual) => {
  const actual = await importActual();
  return {
    makeMold: vi.fn((...args) => {
      fake.mold = actual.makeMold(...args);
      return fake.mold;
    }),
  };
});
vi.mock('../public/game/mycelium.js', () => ({
  myceliumCanvas: vi.fn(),
  drawMycelium: vi.fn(),
}));
vi.mock('../public/game/keyboard.js', () => ({
  arrowKeys: vi.fn(() => ({ direction: () => fake.direction, stop: vi.fn() })),
}));
vi.mock('../public/game/touch.js', () => ({
  touchSteering: vi.fn(() => ({ target: () => fake.target, drag: () => fake.drag, stop: vi.fn() })),
}));
vi.mock('../public/game/spores.js', () => ({ sporeBurst: vi.fn() }));
vi.mock('../public/game/track.js', () => ({ track: vi.fn() }));
vi.mock('../public/game/antifungal.js', async (importActual) => ({
  ...(await importActual()),
  touchedDisk: vi.fn((disks, circles) => fake.hit(circles[0])),
}));

const { moldMessage, playMold, steerAngle } = await import('../public/game/mold-game.js');
const { sporeBurst } = await import('../public/game/spores.js');
const { drawMycelium } = await import('../public/game/mycelium.js');

const page = readFileSync(resolve(process.cwd(), 'public/petri-dish.html'), 'utf8');
const body = page.slice(page.indexOf('<body'), page.indexOf('</body>'));
const M = GAME.MOLD;
const RADIUS = 200;

let frames;
let nutrients;
let now;

function start({ level = 1, target = LEVELS[level - 1].target } = {}) {
  const palEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  palEl.dataset.pal = 'fumi';
  palEl.dataset.name = 'Fumi';
  document.querySelector('.pal-mover').append(palEl);
  playMold(palEl, SPECIES.fumi, nutrients, [], { level, target });
  return { palEl, banner: document.querySelector('.win-banner'), button: document.querySelector('.branch-btn') };
}

function frame(ms = 16) {
  now += ms;
  const waiting = frames;
  frames = [];
  for (const run of waiting) run(now);
}
const frames_ = (n) => {
  for (let i = 0; i < n; i++) frame();
};

const disk = (zone) => ({ fx: 0.5, fy: 0, r: 0.08, zone, antifungal: { code: 'VOR', name: 'voriconazole' } });

beforeEach(() => {
  document.body.outerHTML = body;
  Object.defineProperty(document.querySelector('.agar'), 'clientWidth', { configurable: true, value: RADIUS * 2 });
  frames = [];
  now = 0;
  fake.direction = [0, 0];
  fake.drag = [0, 0];
  fake.target = null;
  fake.hit = () => null;
  nutrients = { stop: vi.fn(), eatNear: vi.fn(() => 0) };
  vi.stubGlobal('location', { href: 'http://localhost/petri-dish.html?pal=fumi&level=1' });
  vi.stubGlobal('requestAnimationFrame', (run) => frames.push(run));
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('steering', () => {
  it('goes the way the arrow keys point, first', () => {
    expect(steerAngle([1, 0], [5, 5], [9, 9], [0, 0])).toBe(0);
    expect(steerAngle([0, -1], [0, 0], null, [0, 0])).toBe(-Math.PI / 2);
  });

  it('then the way a finger dragged, ignoring a tiny wobble', () => {
    expect(steerAngle([0, 0], [0, 4], null, [0, 0])).toBe(Math.PI / 2);
    expect(steerAngle([0, 0], [0.1, 0.1], null, [0, 0])).toBeNull();
  });

  it('then toward a held-down mouse until her tip gets there, or else not at all', () => {
    expect(steerAngle([0, 0], [0, 0], [10, 10], [10, 0])).toBe(Math.PI / 2);
    expect(steerAngle([0, 0], [0, 0], [10, 1], [10, 0])).toBeNull();
    expect(steerAngle([0, 0], [0, 0], null, [0, 0])).toBeNull();
  });

  it("turns her lead tip the way she's steered", () => {
    start();
    fake.direction = [1, 0];
    frames_(10);
    expect(fake.mold.lead.angle).toBeGreaterThan(-Math.PI / 2);
  });
});

describe('Fumi in the dish', () => {
  it('shows her face on her growing tip instead of her spore-stalk picture', () => {
    const { palEl } = start();
    expect(palEl.hasAttribute('hidden')).toBe(true);
    const face = document.querySelector('.pal-mover');
    expect(face.classList.contains('mold-tip')).toBe(true);
    expect(face.querySelector('.tip-face')).not.toBeNull();
    expect(face.style.width).toBe(`${M.TIP_SIZE * 50}%`);
  });

  it("stays put until she's steered", () => {
    start();
    frames_(10);
    expect(fake.mold.lead.length).toBe(0);
  });

  it('grows while steered, keeps her face on her tip, and draws her threads', () => {
    start();
    fake.direction = [0, -1];
    frame();
    frames_(10);
    expect(fake.mold.lead.length).toBeGreaterThan(0);
    const [x, y] = fake.mold.lead.tip;
    expect(document.querySelector('.pal-mover').style.transform).toBe(`translate(${x * RADIUS}px, ${y * RADIUS}px)`);
    expect(drawMycelium).toHaveBeenCalled();
  });

  it('shows the level and cells, and the target in the directions', () => {
    start({ level: 3 });
    expect(document.querySelector('.cell-count').textContent).toBe('Level 3 · 1 / 16 cells');
    expect(document.querySelector('.target-cells').textContent).toBe('16');
  });

  it("doesn't grow before the dish has a size", () => {
    start();
    fake.direction = [0, -1];
    Object.defineProperty(document.querySelector('.agar'), 'clientWidth', { configurable: true, value: 0 });
    frames_(5);
    expect(fake.mold.lead.length).toBe(0);
  });
});

describe('branching', () => {
  it('branches with Space or the Branch button under the dish', () => {
    const { button } = start();
    expect(button.textContent).toBe('Branch');
    expect(button.previousElementSibling).toBe(document.querySelector('.petri-dish'));
    const space = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
    window.dispatchEvent(space);
    expect(space.defaultPrevented).toBe(true); // no scrolling the page
    expect(fake.mold.threads).toHaveLength(2);
    frames_(20); // wait out the cooldown
    fake.mold.growth = 0; // even with nothing stored
    button.click();
    expect(fake.mold.threads).toHaveLength(3);
    expect(button.disabled).toBe(false);
  });

  it("ignores other keys", () => {
    start();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(fake.mold.threads).toHaveLength(1);
  });
});

describe('eating', () => {
  it('feeds her from nutrients touching her tip or any part of her thread', () => {
    start();
    frames_(5);
    const before = fake.mold.growth;
    nutrients.eatNear.mockReturnValueOnce(1);
    frame();
    expect(fake.mold.growth).toBeGreaterThan(before);
    // her tip, with her face's reach, then every point along her thread
    expect(nutrients.eatNear).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), M.TIP_SIZE / 2);
    expect(nutrients.eatNear).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), M.WIDTH);
  });
});

describe('antifungals', () => {
  it('kill a branch tip that touches one, but she keeps growing', () => {
    const { banner } = start();
    frames_(3);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    // only the thin branch tip touches
    fake.hit = ([, , r]) => (r === (M.WIDTH / 2) * RADIUS ? disk(0.1) : null);
    frame();
    expect(fake.mold.threads[1].alive).toBe(false);
    expect(fake.mold.lead.alive).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(banner.hidden).toBe(true);
  });

  it('end the game when her last tip dies', () => {
    const { banner, button } = start({ level: 2 });
    fake.hit = () => disk(0.1);
    frame();
    expect(document.querySelector('.pal-mover').classList.contains('killed')).toBe(true);
    expect(button.disabled).toBe(true);
    expect(nutrients.stop).toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(banner.hidden).toBe(false);
    expect(banner.querySelector('h2').textContent).toBe('Game over');
    expect(banner.querySelector('.win-message').textContent).toBe(moldMessage('Fumi', disk(0.1)));
    expect(banner.querySelector('.start-over').hidden).toBe(false);
    // nothing grows, branches or ends again after that
    const length = fake.mold.lead.length;
    frames_(5);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(fake.mold.lead.length).toBe(length);
    expect(fake.mold.threads).toHaveLength(1);
  });

  it('say what happened: a zone, or a disk with no zone', () => {
    expect(moldMessage('Fumi', disk(0.1))).toBe(
      "Fumi's last growing tip reached the voriconazole zone of inhibition. Antifungals kill fungi!");
    expect(moldMessage('Fumi', { ...disk(0), fullZone: 0 })).toBe(
      "Fumi's last growing tip touched the voriconazole disk. She's resistant to voriconazole, so it has no zone, but the disk still counts!");
  });
});

describe('winning', () => {
  it('celebrates when she reaches the target, then shows the next level', () => {
    const { banner, button } = start();
    frame();
    fake.mold.cellCount = () => 5;
    frame();
    expect(document.querySelector('.cell-count').textContent).toBe('Level 1 · 4 / 4 cells');
    expect(sporeBurst).toHaveBeenCalledWith(document.querySelector('.pal-mover'), { big: false });
    expect(button.disabled).toBe(true);
    vi.advanceTimersByTime(600);
    expect(banner.querySelector('h2').textContent).toBe('Level 1 complete!');
    expect(banner.querySelector('.play-again').textContent).toBe('Play level 2');
  });

  it('throws a bigger burst for beating the last level', () => {
    const { banner } = start({ level: LEVELS.length });
    frame();
    fake.mold.cellCount = () => 999;
    frame();
    expect(sporeBurst).toHaveBeenCalledWith(expect.anything(), { big: true });
    vi.advanceTimersByTime(600);
    expect(banner.querySelector('h2').textContent).toBe('You won!');
  });
});

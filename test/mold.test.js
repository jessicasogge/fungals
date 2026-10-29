// @vitest-environment jsdom
// mold.js: Fumi's game. She's a spore; every nutrient she lands on starts a
// colony that spreads out in a circle, dies if it touches an antifungal disk
// or its zone, and counts as soon as it starts. These tests load the real
// petri dish page into jsdom and stand in for the steering and effects.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANTIFUNGAL_FACTS, GAME, LEVELS, SPECIES } from '../public/game/config.js';

const fake = vi.hoisted(() => ({ keys: [0, 0] }));

vi.mock('../public/game/keyboard.js', () => ({
  arrowKeys: vi.fn(() => ({ direction: () => fake.keys, stop: vi.fn() })),
}));
vi.mock('../public/game/touch.js', async (importActual) => ({
  ...(await importActual()),
  touchSteering: vi.fn(() => ({ target: () => null, drag: () => [0, 0], stop: vi.fn() })),
}));
vi.mock('../public/game/spores.js', () => ({ sporeBurst: vi.fn() }));
vi.mock('../public/game/track.js', () => ({ track: vi.fn() }));

const { CAPS, colonyRadius, DROPS, moldColonies, playMold, POD_SPORES, sporeGroup, swimmerGroup, TUFTS } = await import('../public/game/mold.js');
const { sporeBurst } = await import('../public/game/spores.js');
const { track } = await import('../public/game/track.js');

// (jsdom changes import.meta.url to a web address, so find the file from the project folder.)
const page = readFileSync(resolve(process.cwd(), 'public/petri-dish.html'), 'utf8');
const body = page.slice(page.indexOf('<body'), page.indexOf('</body>'));

const { colors } = SPECIES.fumi;
const disk = (fx, fy, zone = 0.05) =>
  ({ fx, fy, r: 0.08, zone, antifungal: { code: 'VOR', name: 'voriconazole' } });

// Nutrients that record what's been eaten, with flecks at the given spots.
function fakeNutrients(spots = []) {
  const flecks = [...spots];
  return {
    flecks,
    eatNear: vi.fn((x, y, reach, eaten = () => {}) => {
      const before = flecks.length;
      for (let i = flecks.length - 1; i >= 0; i--) {
        if (Math.hypot(flecks[i][0] - x, flecks[i][1] - y) > reach) continue;
        const [[fx, fy]] = flecks.splice(i, 1);
        eaten(fx, fy);
      }
      return before - flecks.length;
    }),
    positions: () => flecks.map(([fx, fy]) => ({ fx, fy })),
    stop: vi.fn(),
  };
}

beforeEach(() => {
  document.body.outerHTML = body;
  fake.keys = [0, 0];
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('a colony', () => {
  it('spreads at a steady pace from small to full size, then stops', () => {
    expect(colonyRadius(0)).toBe(GAME.COLONY_START);
    const half = colonyRadius(GAME.COLONY_GROW_SECONDS / 2);
    expect(half).toBeCloseTo((GAME.COLONY_START + GAME.COLONY_FULL) / 2);
    expect(colonyRadius(GAME.COLONY_GROW_SECONDS)).toBe(GAME.COLONY_FULL);
    expect(colonyRadius(100)).toBe(GAME.COLONY_FULL);
    expect(colonyRadius(-1)).toBe(GAME.COLONY_START);
  });
});

describe('the colonies', () => {
  let layer;
  beforeEach(() => {
    layer = document.createElement('div');
    document.querySelector('.agar').append(layer);
  });

  it('starts one where the spore lands, drawn small on the agar', () => {
    const colonies = moldColonies({ layer, nutrients: fakeNutrients(), colors });
    const colony = colonies.plant(0.5, -0.25);
    expect(colonies.colonies).toEqual([colony]);
    expect(colony.el.parentElement).toBe(layer);
    expect(colony.el.className).toBe('colony');
    expect(colony.el.style.left).toBe('75%');
    expect(colony.el.style.top).toBe('37.5%');
    expect(colony.el.style.width).toBe(`${GAME.COLONY_START * 100}%`);
    expect(colony.el.style.getPropertyValue('--spores')).toBe(colors.spores);
    // It counts right away.
    expect(colonies.count()).toBe(1);
  });

  it("beads Ruby's colonies with red drops, one at a time, as they ripen", () => {
    const ruby = SPECIES.ruby.colors;
    const colonies = moldColonies({ layer, nutrients: fakeNutrients(), colors: ruby, drops: true });
    const colony = colonies.plant(0, 0);
    const drops = [...colony.el.querySelectorAll('.drop')];
    const shown = () => drops.filter((d) => d.classList.contains('shown')).length;
    expect(DROPS).toHaveLength(3);
    expect(drops).toHaveLength(DROPS.length);
    expect(drops[0].style.background).toBeTruthy();
    expect(shown()).toBe(0);
    colonies.grow(GAME.COLONY_GROW_SECONDS * 0.6);
    expect(shown()).toBe(DROPS.filter((d) => d.at <= 0.6).length);
    expect(shown()).toBeGreaterThan(0);
    colonies.grow(GAME.COLONY_GROW_SECONDS);
    expect(shown()).toBe(DROPS.length);
  });

  it("keeps Ruby's colonies where they started as they grow", () => {
    const colonies = moldColonies({ layer, nutrients: fakeNutrients(), colors: SPECIES.ruby.colors, drops: true });
    const colony = colonies.plant(0.3, -0.2);
    colonies.grow(GAME.COLONY_GROW_SECONDS);
    expect(colony.el.style.left).toBe('65%');
    expect(colony.el.style.top).toBe('40%');
    // Turning her drops moves only the drops, never the colony itself.
    expect(colony.el.style.rotate).toBe('');
    for (const drop of colony.el.querySelectorAll('.drop')) {
      for (const at of [drop.style.left, drop.style.top]) {
        expect(parseFloat(at)).toBeGreaterThan(10);
        expect(parseFloat(at)).toBeLessThan(90);
      }
    }
  });

  it("draws Rosie's colonies wrinkled, darkening to her brown-black", () => {
    const colonies = moldColonies({ layer, nutrients: fakeNutrients(), colors: SPECIES.rosie.colors, wrinkled: true });
    const colony = colonies.plant(0, 0);
    expect(colony.el.classList).toContain('wrinkled');
    expect(colony.el.style.getPropertyValue('--spores')).toBe(SPECIES.rosie.colors.spores);
    expect(moldColonies({ layer, nutrients: fakeNutrients(), colors }).plant(0, 0).el.classList).not.toContain('wrinkled');
  });

  it("draws Trixie's colonies powdery, with her warm tan middle", () => {
    const colonies = moldColonies({ layer, nutrients: fakeNutrients(), colors: SPECIES.trixie.colors, powdery: true });
    const colony = colonies.plant(0, 0);
    expect(colony.el.classList).toContain('powdery');
    expect(colony.el.classList).not.toContain('wrinkled');
    expect(colony.el.style.getPropertyValue('--spores')).toBe(SPECIES.trixie.colors.spores);
  });

  it("sprouts a bunch of Velma's caps on her cottony colonies, one at a time, as they ripen", () => {
    const velma = SPECIES.velma.colors;
    const colonies = moldColonies({ layer, nutrients: fakeNutrients(), colors: velma, caps: true });
    const colony = colonies.plant(0, 0);
    expect(colony.el.classList).toContain('cottony');
    expect(colony.el.querySelector('.drop')).toBeNull();
    const caps = [...colony.el.querySelectorAll('.cap')];
    const shown = () => caps.filter((c) => c.classList.contains('shown')).length;
    expect(caps).toHaveLength(CAPS.length);
    expect(caps.filter((c) => c.classList.contains('big'))).toHaveLength(1);
    expect(caps[0].style.getPropertyValue('--cap')).toBe(velma.fill);
    expect(caps[0].style.getPropertyValue('--cap-edge')).toBe(velma.stroke);
    expect(shown()).toBe(0);
    colonies.grow(GAME.COLONY_GROW_SECONDS * 0.8);
    expect(shown()).toBe(CAPS.filter((c) => c.at <= 0.8).length);
    colonies.grow(GAME.COLONY_GROW_SECONDS);
    expect(shown()).toBe(CAPS.length);
  });

  it("gives other molds' colonies no drops", () => {
    const colony = moldColonies({ layer, nutrients: fakeNutrients(), colors }).plant(0, 0);
    expect(colony.el.querySelector('.drop')).toBeNull();
  });

  it('starts one even on top of another, drawn over it', () => {
    const colonies = moldColonies({ layer, nutrients: fakeNutrients(), colors });
    const under = colonies.plant(0, 0);
    colonies.grow(GAME.COLONY_GROW_SECONDS);
    const over = colonies.plant(0.1, 0);
    expect(colonies.colonies).toEqual([under, over]);
    expect(layer.lastElementChild).toBe(over.el);
  });

  it('grows out, greenish only in the middle, then stays full size', () => {
    const colonies = moldColonies({ layer, nutrients: fakeNutrients(), colors });
    const colony = colonies.plant(0, 0);
    colonies.grow(GAME.COLONY_GROW_SECONDS / 2);
    expect(colony.r).toBeCloseTo(colonyRadius(GAME.COLONY_GROW_SECONDS / 2));
    expect(colony.el.style.getPropertyValue('--ripe')).toBe('20%');
    colonies.grow(GAME.COLONY_GROW_SECONDS / 2);
    expect(colony.el.style.width).toBe(`${GAME.COLONY_FULL * 100}%`);
    // The green never covers more than the middle.
    expect(colony.el.style.getPropertyValue('--ripe')).toBe('40%');
    colonies.grow(1);
    expect(colony.r).toBe(GAME.COLONY_FULL);
  });

  it('starts a new colony at each nutrient it grows over', () => {
    const nutrients = fakeNutrients([[0.1, 0], [0.6, 0]]);
    const colonies = moldColonies({ layer, nutrients, colors });
    colonies.plant(0, 0);
    colonies.grow(0);
    expect(nutrients.flecks).toHaveLength(2);
    expect(colonies.count()).toBe(1);
    colonies.grow(GAME.COLONY_GROW_SECONDS);
    // The fleck it reached is eaten, and a colony starts right where it was.
    expect(nutrients.flecks).toEqual([[0.6, 0]]);
    expect(colonies.count()).toBe(2);
    expect(colonies.colonies[1]).toMatchObject({ fx: 0.1, fy: 0, age: 0 });
  });

  it('pops, the whole colony at once, if it touches a disk or its zone', () => {
    const disks = [disk(0.5, 0)];
    const colonies = moldColonies({ layer, disks, nutrients: fakeNutrients(), colors });
    const safe = colonies.plant(-0.5, 0);
    const doomed = colonies.plant(0.3, 0);
    // Still small: clear of the zone (which starts at 0.5 - 0.08 - 0.05).
    expect(colonies.killInZones(200)).toBe(0);
    colonies.grow(GAME.COLONY_GROW_SECONDS);
    expect(colonies.killInZones(200)).toBe(1);
    expect(colonies.colonies).toEqual([safe]);
    expect(doomed.el.classList.contains('dying')).toBe(true);
    // A pop ring, sized and placed in px.
    const pop = layer.parentElement.querySelector('.pop');
    expect(pop.style.width).toBe(`${2 * GAME.COLONY_FULL * 200}px`);
    expect(pop.style.left).toBe(`calc(50% + ${0.3 * 200}px)`);
    // Gone once it has faded, or after a moment if the animation never runs.
    doomed.el.dispatchEvent(new Event('animationend'));
    expect(doomed.el.isConnected).toBe(false);
    vi.runAllTimers();
  });

  it("dies to a zone that spreads out to it, even when it's grown", () => {
    const d = disk(0.5, 0, 0);
    const colonies = moldColonies({ layer, disks: [d], nutrients: fakeNutrients(), colors });
    const colony = colonies.plant(0.15, 0);
    colonies.grow(GAME.COLONY_GROW_SECONDS);
    expect(colonies.killInZones(200)).toBe(0);
    d.zone = 0.15;
    expect(colonies.killInZones(200)).toBe(1);
    vi.runAllTimers();
    expect(colony.el.isConnected).toBe(false);
  });
});

describe("Ember's colonies", () => {
  let layer;
  beforeEach(() => {
    layer = document.createElement('div');
    document.querySelector('.agar').append(layer);
  });

  it("grow faster and bigger than anyone else's", () => {
    expect(GAME.FAST_GROW_SECONDS).toBeLessThan(GAME.COLONY_GROW_SECONDS);
    expect(GAME.FAST_FULL).toBeGreaterThan(GAME.COLONY_FULL);
    expect(colonyRadius(GAME.FAST_GROW_SECONDS, { full: GAME.FAST_FULL, grow: GAME.FAST_GROW_SECONDS })).toBe(GAME.FAST_FULL);
    // They start the same size as anyone's.
    const fast = moldColonies({ layer, nutrients: fakeNutrients(), colors: SPECIES.ember.colors, fast: true }).plant(0, 0);
    const steady = moldColonies({ layer, nutrients: fakeNutrients(), colors }).plant(0, 0);
    expect(fast.r).toBe(steady.r);
  });

  it('reach full size sooner, and spread over nutrients further', () => {
    const ember = moldColonies({ layer, nutrients: fakeNutrients([[0.18, 0]]), colors: SPECIES.ember.colors, fast: true });
    const fumi = moldColonies({ layer, nutrients: fakeNutrients([[0.18, 0]]), colors });
    const e = ember.plant(0, 0);
    const f = fumi.plant(0, 0);
    ember.grow(GAME.FAST_GROW_SECONDS);
    fumi.grow(GAME.FAST_GROW_SECONDS);
    expect(e.r).toBeCloseTo(GAME.FAST_FULL);
    expect(f.r).toBeLessThan(GAME.COLONY_FULL);
    // Hers reached the nutrient and started a new colony; Fumi's didn't.
    expect(ember.count()).toBe(2);
    expect(fumi.count()).toBe(1);
  });

  it('turn orange and sprout tufts of spores, one at a time, as they ripen', () => {
    const colonies = moldColonies({ layer, nutrients: fakeNutrients(), colors: SPECIES.ember.colors, fast: true, tufts: true });
    const colony = colonies.plant(0, 0);
    expect(colony.el.classList).toContain('fiery');
    const tufts = [...colony.el.querySelectorAll('.tuft')];
    expect(tufts).toHaveLength(TUFTS.length);
    const shown = () => tufts.filter((t) => t.classList.contains('shown')).length;
    expect(shown()).toBe(0);
    colonies.grow(GAME.FAST_GROW_SECONDS * 0.5);
    expect(shown()).toBe(TUFTS.filter((t) => t.at <= 0.5).length);
    colonies.grow(GAME.FAST_GROW_SECONDS);
    expect(shown()).toBe(TUFTS.length);
  });
});

describe("Bea's pods", () => {
  let layer;
  beforeEach(() => {
    layer = document.createElement('div');
    document.querySelector('.agar').append(layer);
  });

  it('are small, fill with spores as they ripen, then burst once, without spreading over nutrients', () => {
    const nutrients = fakeNutrients([[0.06, 0]]);
    const onBurst = vi.fn();
    const pods = moldColonies({ layer, nutrients, colors: SPECIES.bea.colors, pods: true, onBurst });
    const pod = pods.plant(0, 0);
    expect(pod.el.className).toBe('colony pod');
    expect(pod.r).toBeCloseTo(GAME.COLONY_START * GAME.POD_SCALE);
    const spores = [...pod.el.querySelectorAll('.pod-spore')];
    expect(spores).toHaveLength(POD_SPORES.length);
    const shown = () => spores.filter((s) => s.classList.contains('shown')).length;
    pods.grow(GAME.COLONY_GROW_SECONDS * 0.5);
    expect(shown()).toBe(POD_SPORES.filter((s) => s.at <= 0.5).length);
    expect(onBurst).not.toHaveBeenCalled();
    pods.grow(GAME.COLONY_GROW_SECONDS);
    expect(pod.r).toBeCloseTo(GAME.COLONY_FULL * GAME.POD_SCALE);
    expect(onBurst).toHaveBeenCalledWith(pod);
    expect(pod.el.classList).toContain('burst');
    pods.grow(1);
    expect(onBurst).toHaveBeenCalledTimes(1);
    // A pod never spreads over a nutrient to start another one.
    expect(nutrients.eatNear).not.toHaveBeenCalled();
    expect(pods.count()).toBe(1);
  });
});

describe("Bea's swimmers", () => {
  let layer;
  beforeEach(() => {
    layer = document.createElement('div');
    document.querySelector('.agar').append(layer);
  });
  const swimmerEls = () => [...layer.querySelectorAll('.swimmer')];

  it('come out of a burst pod, spread evenly around it', () => {
    const swimmers = swimmerGroup({ layer, nutrients: fakeNutrients(), plant: vi.fn(), colors: SPECIES.bea.colors });
    swimmers.release(0.2, 0.2, 0.05);
    expect(swimmers.swimmers).toHaveLength(GAME.SWIMMERS);
    expect(swimmerEls()).toHaveLength(GAME.SWIMMERS);
    for (const s of swimmers.swimmers) expect(Math.hypot(s.fx - 0.2, s.fy - 0.2)).toBeCloseTo(0.05);
    expect(swimmerEls()[0].style.getPropertyValue('--edge')).toBe(SPECIES.bea.colors.stroke);
  });

  it('paddle to the nearest nutrient in range and start a new pod there', () => {
    const plant = vi.fn();
    const nutrients = fakeNutrients([[0.3, 0], [0.9, 0.3]]);
    const swimmers = swimmerGroup({ layer, nutrients, plant, colors: SPECIES.bea.colors });
    swimmers.release(0, 0, 0);
    for (let t = 0; t < 2 && swimmers.swimmers.length; t += 0.05) swimmers.step(0.05, 200);
    expect(plant).toHaveBeenCalledWith(0.3, 0);
    expect(plant).toHaveBeenCalledTimes(1);
    // The others found nothing else in range, and keep swimming for now.
    expect(swimmers.swimmers.length).toBe(GAME.SWIMMERS - 1);
    expect(swimmerEls()[0].style.rotate).toMatch(/deg$/);
  });

  it('give up after a while, or at the edge of the dish', () => {
    const swimmers = swimmerGroup({ layer, nutrients: fakeNutrients(), plant: vi.fn(), colors: SPECIES.bea.colors });
    swimmers.release(0, 0, 0);
    // Spread around a pod by the rim, at least one of these is always past
    // the edge, whichever way they happen to face.
    swimmers.release(0.94, 0, 0.03);
    swimmers.step(0.05, 200);
    expect(swimmers.swimmers.length).toBeLessThan(2 * GAME.SWIMMERS);
    swimmers.step(GAME.SWIM_SECONDS, 200);
    expect(swimmers.swimmers).toHaveLength(0);
    expect(swimmerEls()).toHaveLength(0);
  });

  it('pop in a zone', () => {
    const plant = vi.fn();
    const swimmers = swimmerGroup({
      layer, nutrients: fakeNutrients([[0.5, 0]]), disks: [disk(0.25, 0, 0.02)], plant, colors: SPECIES.bea.colors,
    });
    swimmers.release(0, 0, 0);
    for (let t = 0; t < 2; t += 0.05) swimmers.step(0.05, 200);
    expect(plant).not.toHaveBeenCalled();
    expect(document.querySelector('.pop')).not.toBeNull();
  });
});

describe('the spore', () => {
  it('is one small round cell that stays in the dish', () => {
    const agar = document.querySelector('.agar');
    const mover = document.querySelector('.gal-mover');
    vi.spyOn(agar, 'clientWidth', 'get').mockReturnValue(400);
    vi.spyOn(mover, 'offsetWidth', 'get').mockReturnValue(20);
    const spore = sporeGroup({ mover, agar });
    spore.x = 30;
    spore.y = -10;
    expect(spore.body()).toEqual([[30, -10, 8.5]]);
    spore.facing = -1;
    spore.place();
    expect(mover.style.transform).toBe('translate(30px, -10px) scaleX(-1)');
    // Past the rim, she's kept just inside it.
    spore.x = 500;
    spore.y = 0;
    spore.place();
    expect([spore.x, spore.y]).toEqual([190, 0]);
  });
});

describe('playing as a mold', () => {
  let frames;
  let now;
  let agar;
  let mover;

  // Start a level as Fumi, with nutrient flecks at `spots`.
  function start({ level = 1, target = LEVELS[level - 1].colonies, disks = [], spots = [] } = {}) {
    frames = [];
    now = 0;
    vi.stubGlobal('requestAnimationFrame', (run) => frames.push(run));
    vi.stubGlobal('location', { href: 'http://localhost/petri-dish.html?pal=fumi&level=1' });
    agar = document.querySelector('.agar');
    mover = document.querySelector('.gal-mover');
    vi.spyOn(agar, 'clientWidth', 'get').mockReturnValue(400);
    vi.spyOn(mover, 'offsetWidth', 'get').mockReturnValue(20);
    const galEl = document.createElement('div');
    galEl.dataset.gal = 'fumi';
    galEl.dataset.name = 'Fumi';
    const nutrients = fakeNutrients(spots);
    playMold(galEl, SPECIES.fumi, nutrients, disks, { level, target });
    return { nutrients, banner: document.querySelector('.win-banner') };
  }

  function frame(ms = 16) {
    now += ms;
    const waiting = frames;
    frames = [];
    for (const run of waiting) run(now);
  }

  // Run frames for `seconds` of play.
  function play(seconds) {
    for (let t = 0; t < seconds; t += 0.05) frame(50);
  }

  const counter = () => document.querySelector('.cell-count').textContent;
  const colonyEls = () => [...agar.querySelectorAll('.colonies .colony')];

  it('counts colonies instead of cells, and puts the target in the directions', () => {
    start({ level: 3 });
    expect(counter()).toBe('Level 3 · 0 / 18 colonies');
    expect(document.querySelector('.target-colonies').textContent).toBe('18');
    expect(mover.classList.contains('spore')).toBe(true);
    // Colonies grow on a layer under everything else on the agar.
    expect(agar.firstElementChild.className).toBe('colonies');
  });

  it('defaults to level 1', () => {
    vi.stubGlobal('requestAnimationFrame', () => {});
    playMold(document.createElement('div'), SPECIES.fumi, fakeNutrients(), []);
    expect(document.querySelector('.cell-count').textContent).toBe('Level 1 · 0 / 6 colonies');
  });

  it('floats with the arrow keys, a little faster than a yeast swims', () => {
    start();
    frame(); // first frame: no time has passed
    fake.keys = [1, 0];
    frame(50);
    expect(mover.style.transform).toBe(`translate(${GAME.SPORE_SPEED * 200 * 0.05}px, 0px) scaleX(1)`);
  });

  it('starts a colony when she lands on a nutrient, and counts it right away', () => {
    const { banner } = start({ spots: [[0, 0]], target: 2 });
    frame();
    expect(colonyEls()).toHaveLength(1);
    expect(counter()).toBe('Level 1 · 1 / 2 colonies');
    play(GAME.COLONY_GROW_SECONDS + 0.1);
    expect(counter()).toBe('Level 1 · 1 / 2 colonies');
    expect(banner.hidden).toBe(true);
  });

  it('starts a colony right away from a nutrient that turns up under a colony', () => {
    const { nutrients } = start({ spots: [[0, 0]], target: 3 });
    frame();
    // Float away from it, then a fleck appears inside the colony's edge.
    fake.keys = [1, 0];
    play(1);
    fake.keys = [0, 0];
    nutrients.flecks.push([-0.05, 0]);
    frame(50);
    expect(nutrients.flecks).toEqual([]);
    expect(colonyEls()).toHaveLength(2);
    expect(colonyEls()[1].style.left).toBe(`${50 - 0.05 * 50}%`);
  });

  it("grows the colony out from exactly where the nutrient was, not from her middle", () => {
    // She reaches 0.0425 of the dish radius; the fleck is a little off to
    // her right.
    start({ spots: [[0.03, 0]], target: 3 });
    frame();
    const [colony] = colonyEls();
    expect(colony.style.left).toBe(`${50 + 0.03 * 50}%`);
    expect(colony.style.top).toBe('50%');
  });

  it('starts a colony when she lands on a nutrient on top of a colony', () => {
    const { nutrients } = start({ spots: [[0, 0]], target: 3 });
    frame();
    play(1);
    // A new fleck right under her, on top of her first colony.
    nutrients.flecks.push([0, 0]);
    frame(50);
    expect(colonyEls()).toHaveLength(2);
    expect(counter()).toBe('Level 1 · 2 / 3 colonies');
  });

  it('counts a colony started from a nutrient a colony spread over, toward the win', () => {
    const { banner } = start({ spots: [[0, 0], [0.1, 0]], target: 2 });
    frame();
    expect(counter()).toBe('Level 1 · 1 / 2 colonies');
    play(GAME.COLONY_GROW_SECONDS);
    expect(colonyEls()).toHaveLength(2);
    vi.runAllTimers();
    expect(banner.hidden).toBe(false);
  });

  it('wins the level as soon as enough colonies have started', () => {
    const { banner, nutrients } = start({ spots: [[0, 0]], target: 1, level: 2 });
    frame();
    expect(nutrients.stop).toHaveBeenCalled();
    expect(sporeBurst).toHaveBeenCalledWith(mover, { big: false });
    vi.runAllTimers();
    expect(banner.hidden).toBe(false);
    expect(banner.querySelector('h2').textContent).toBe('Level 2 complete!');
    expect(banner.querySelector('.win-message').textContent).toBe('You grew 1 colony!');
    expect(banner.querySelector('.play-again').textContent).toBe('Play level 3');
    expect(track).toHaveBeenCalledWith('level-complete/fumi/level-2', 'Fumi finished level 2');
    // Play stops (the counter stays put), but the colonies keep spreading.
    const [colony] = colonyEls();
    const width = colony.style.width;
    frame(50);
    expect(counter()).toBe('Level 2 · 1 / 1 colony');
    expect(colony.style.width).not.toBe(width);
  });

  it('wins the whole game on the last level', () => {
    const { banner } = start({ spots: [[0, 0]], target: 1, level: LEVELS.length });
    frame();
    vi.runAllTimers();
    expect(sporeBurst).toHaveBeenCalledWith(mover, { big: true });
    expect(banner.querySelector('h2').textContent).toBe('You won!');
    expect(banner.querySelector('.win-message').textContent)
      .toBe(`You beat all ${LEVELS.length} levels with 1 colony!`);
    expect(banner.querySelector('.play-again').textContent).toBe('Play again');
    expect(track).toHaveBeenCalledWith('won-all-levels/fumi', 'Fumi beat every level');
  });

  it('loses a colony that grows into a zone', () => {
    const { banner } = start({ spots: [[0, 0]], disks: [disk(0.25, 0, 0.03)], target: 2 });
    frame();
    expect(counter()).toBe('Level 1 · 1 / 2 colonies');
    play(GAME.COLONY_GROW_SECONDS + 0.1);
    expect(colonyEls().filter((el) => !el.classList.contains('dying'))).toHaveLength(0);
    expect(counter()).toBe('Level 1 · 0 / 2 colonies');
    vi.runAllTimers();
    expect(banner.hidden).toBe(true);
  });

  it("as Bea, a ripe pod bursts into swimmers that start more pods toward the win", () => {
    frames = [];
    now = 0;
    vi.stubGlobal('requestAnimationFrame', (run) => frames.push(run));
    agar = document.querySelector('.agar');
    mover = document.querySelector('.gal-mover');
    vi.spyOn(agar, 'clientWidth', 'get').mockReturnValue(400);
    vi.spyOn(mover, 'offsetWidth', 'get').mockReturnValue(20);
    const galEl = document.createElement('div');
    galEl.dataset.gal = 'bea';
    galEl.dataset.name = 'Bea';
    const nutrients = fakeNutrients([[0, 0], [0.3, 0.3]]);
    playMold(galEl, SPECIES.bea, nutrients, [], { level: 1, target: 2 });
    frame();
    expect(colonyEls()).toHaveLength(1);
    expect(colonyEls()[0].classList).toContain('pod');
    play(GAME.COLONY_GROW_SECONDS + 0.2);
    expect(agar.querySelectorAll('.swimmer').length).toBeGreaterThan(0);
    play(2);
    // A swimmer settled on the other nutrient and won the level.
    expect(colonyEls()).toHaveLength(2);
    // She counts pods, not colonies, and says so when she wins.
    expect(counter()).toBe('Level 1 · 2 / 2 pods');
    vi.runAllTimers();
    expect(document.querySelector('.win-message').textContent).toBe('You grew 2 pods!');
  });

  it('is game over when the spore touches a disk or its zone', () => {
    const { banner, nutrients } = start({ level: 2, disks: [disk(0, 0)] });
    frame();
    expect(mover.classList.contains('killed')).toBe(true);
    expect(nutrients.stop).toHaveBeenCalled();
    vi.runAllTimers();
    expect(banner.querySelector('h2').textContent).toBe('Game over');
    expect(banner.querySelector('.win-message').textContent)
      .toBe('Fumi swam into the voriconazole zone of inhibition. Antifungals kill fungi!');
    expect(banner.querySelector('.play-again').textContent).toBe('Try level 2 again');
    expect(banner.querySelector('.start-over').hidden).toBe(false);
    // The "Did you know?" line says how voriconazole works, not a fact about Fumi.
    expect(banner.querySelector('.fun-fact-text').textContent).toBe(ANTIFUNGAL_FACTS.VOR);
    expect(track).toHaveBeenCalledWith('game-over/fumi/level-2/VOR', 'Fumi hit voriconazole on level 2');
  });
});

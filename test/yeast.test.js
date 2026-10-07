// @vitest-environment jsdom
// yeast.js draws cells into the page, so these tests run in jsdom, a
// simulated browser page.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { R, SPACING } from '../public/game/attach.js';
import { yeastGroup } from '../public/game/yeast.js';
import { GAME, SPECIES } from '../public/game/config.js';

// jsdom doesn't lay anything out, so every width reads as 0. Give the dish a
// fixed size and work out each mover's width from its percent width, the way
// the browser would.
const DISH_WIDTH = 400;
const DISH_RADIUS = DISH_WIDTH / 2;
const CELL_PX = 0.05 * DISH_WIDTH; // CELL_SIZE is 5% of the dish
const UNIT = CELL_PX / (2 * R); // pixels per SVG unit

let saved;
beforeEach(() => {
  document.body.innerHTML = '<div class="agar"></div>';
  saved = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return ((parseFloat(this.style.width) || 0) / 100) * DISH_WIDTH;
    },
  });
});
afterEach(() => {
  if (saved) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', saved);
  else delete HTMLElement.prototype.offsetWidth;
});

// A group in the dish at (x, y) px from the center, like the game makes.
function makeGroup(name, { isPlayer = false, x = 0, y = 0 } = {}) {
  const mover = document.createElement('div');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mover.appendChild(svg);
  document.querySelector('.agar').appendChild(mover);
  const group = yeastGroup({ mover, svg, species: SPECIES[name], isPlayer });
  group.x = x;
  group.y = y;
  return group;
}

// Grow an offspring group to `size` cells by budding from a player next to it.
function grow(group, size) {
  const player = makeGroup('sasha', { isPlayer: true, x: group.x, y: group.y });
  while (group.cellCount() < size) {
    player.divide([group], DISH_RADIUS);
    group.update(1); // finish sliding the new cell into place
  }
}

const cellCenters = (group) => group.body().map(([x, y]) => [x, y]);
const distance = ([ax, ay], [bx, by]) => Math.hypot(ax - bx, ay - by);

describe('a new yeast cell', () => {
  it('starts as a single cell', () => {
    const player = makeGroup('sasha', { isPlayer: true });
    expect(player.cellCount()).toBe(1);
  });

  it('only the player has a face', () => {
    const player = makeGroup('sasha', { isPlayer: true });
    const offspring = makeGroup('sasha');
    expect(player.svg.querySelectorAll('ellipse:not(.cell-body)')).toHaveLength(2); // cheeks
    expect(offspring.svg.querySelectorAll('ellipse:not(.cell-body)')).toHaveLength(0);
  });

  it('draws in its species colors', () => {
    const candi = makeGroup('candi');
    expect(candi.svg.querySelector('.cell-body').getAttribute('fill'))
      .toBe(SPECIES.candi.colors.fill);
  });

  it('has a body of one circle, one cell wide plus its outline, where the group is', () => {
    const group = makeGroup('sasha', { x: 30, y: -40 });
    const [[x, y, r]] = group.body();
    expect(x).toBeCloseTo(30);
    expect(y).toBeCloseTo(-40);
    const OUTLINE = 1.7;
    expect(r).toBeCloseTo((R + OUTLINE / 2) * UNIT);
  });
});

describe('budding with no group nearby', () => {
  it('starts a new offspring group where the player is', () => {
    const player = makeGroup('sasha', { isPlayer: true, x: 20, y: 10 });
    const child = player.divide([], DISH_RADIUS);
    expect(child).not.toBeNull();
    expect(child.isPlayer).toBe(false);
    expect(child.cellCount()).toBe(1);
    expect([child.x, child.y]).toEqual([20, 10]);
  });

  it('sends the new group off with a push', () => {
    const player = makeGroup('sasha', { isPlayer: true });
    const child = player.divide([], DISH_RADIUS);
    expect(Math.hypot(child.vx, child.vy)).toBeCloseTo(GAME.BURST_SPEED * DISH_RADIUS * 0.5);
  });

  it('adds the new group to the dish as a faceless, hidden-from-screen-readers copy', () => {
    const player = makeGroup('sasha', { isPlayer: true });
    const child = player.divide([], DISH_RADIUS);
    expect(child.mover.parentElement).toBe(document.querySelector('.agar'));
    expect(child.mover.classList.contains('offspring')).toBe(true);
    expect(child.svg.getAttribute('aria-hidden')).toBe('true');
    expect(child.svg.querySelectorAll('ellipse:not(.cell-body)')).toHaveLength(0);
  });

  it('leaves the player a single cell', () => {
    const player = makeGroup('sasha', { isPlayer: true });
    player.divide([], DISH_RADIUS);
    expect(player.cellCount()).toBe(1);
  });
});

describe('budding next to a group', () => {
  it('adds the daughter to the group instead of starting a new one', () => {
    const group = makeGroup('sasha', { x: 30 });
    const player = makeGroup('sasha', { isPlayer: true, x: 50 });
    expect(player.divide([group], DISH_RADIUS)).toBeNull();
    expect(group.cellCount()).toBe(2);
  });

  it('slides the new cell from the player into place, touching its neighbor', () => {
    const group = makeGroup('sasha', { x: 0 });
    const player = makeGroup('sasha', { isPlayer: true, x: 50 });
    player.divide([group], DISH_RADIUS);

    // It starts where the player is...
    group.update(0);
    expect(cellCenters(group)[1][0]).toBeCloseTo(50);

    // ...and ends up touching the first cell, on the player's side.
    group.update(GAME.DIVIDE_MS / 1000);
    const [first, second] = cellCenters(group);
    expect(distance(first, second)).toBeCloseTo(SPACING * 0.95 * UNIT); // snug in a cluster
    expect(second[0]).toBeGreaterThan(first[0]);
  });

  it('starts a new group if the nearest one is out of reach', () => {
    const group = makeGroup('sasha', { x: 0 });
    const player = makeGroup('sasha', { isPlayer: true, x: GAME.SNAP_REACH * DISH_RADIUS + 40 });
    expect(player.divide([group], DISH_RADIUS)).not.toBeNull();
    expect(group.cellCount()).toBe(1);
  });

  it('joins whichever group is nearest', () => {
    const near = makeGroup('sasha', { x: 20 });
    const far = makeGroup('sasha', { x: -45 });
    const player = makeGroup('sasha', { isPlayer: true, x: 0 });
    player.divide([far, near], DISH_RADIUS);
    expect(near.cellCount()).toBe(2);
    expect(far.cellCount()).toBe(1);
  });

  it(`stops growing a group at ${GAME.GROUP_CAP} cells`, () => {
    const group = makeGroup('sasha');
    grow(group, GAME.GROUP_CAP);
    const player = makeGroup('sasha', { isPlayer: true, x: 5 });
    expect(group.attachSpot(5, 0, [], DISH_RADIUS)).toBeNull();
    expect(player.divide([group], DISH_RADIUS)).not.toBeNull();
    expect(group.cellCount()).toBe(GAME.GROUP_CAP);
  });

  it('never lets two cells in a grown cluster sit on top of each other', () => {
    const group = makeGroup('sasha');
    grow(group, GAME.GROUP_CAP);
    const centers = cellCenters(group);
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        expect(distance(centers[i], centers[j])).toBeGreaterThan(R * UNIT);
      }
    }
  });

  it('works out the right spot when the group is flipped to face left', () => {
    const group = makeGroup('sasha', { x: 0 });
    group.facing = -1;
    const spot = group.attachSpot(50, 0, [], DISH_RADIUS);
    expect(spot.world[0]).toBeGreaterThan(0); // still on the player's side
    expect(distance(spot.world, [0, 0])).toBeCloseTo(SPACING * 0.95 * UNIT);
  });
});

describe('sliding a new cell into place', () => {
  // A group that has just had a cell join it from the player 50px away.
  function joining() {
    const group = makeGroup('sasha');
    const player = makeGroup('sasha', { isPlayer: true, x: 50 });
    player.divide([group], DISH_RADIUS);
    const cell = group.cells.find((c) => c.fromX !== c.toX || c.fromY !== c.toY);
    return { group, cell };
  }

  it('glides partway there midway through, fast at first and slowing as it arrives', () => {
    const { group, cell } = joining();
    const half = GAME.DIVIDE_MS / 2000; // half the slide, in seconds
    group.update(half);
    // Halfway through the time it's already 7/8 of the way (an ease-out).
    expect(cell.x).toBeCloseTo(cell.fromX + (cell.toX - cell.fromX) * 0.875);
    expect(cell.y).toBeCloseTo(cell.fromY + (cell.toY - cell.fromY) * 0.875);
    expect(group.moveFor).not.toBeNull(); // still sliding
  });

  it('adds up the time across frames, landing exactly in place and stopping', () => {
    const { group, cell } = joining();
    const frame = GAME.DIVIDE_MS / 1000 / 10;
    for (let i = 0; i < 9; i++) group.update(frame);
    expect(group.moveFor).not.toBeNull();
    group.update(frame * 2); // a slow last frame overshoots the time, not the spot
    expect([cell.x, cell.y]).toEqual([cell.toX, cell.toY]);
    expect(group.moveFor).toBeNull();
  });

  it("stops redrawing once everything is still, since that's slow with many cells", () => {
    const { group } = joining();
    group.update(5); // finish the slide, and the daughter growing
    group.svg.innerHTML = '<g class="marker" />'; // anything a redraw would replace
    group.update(1);
    expect(group.svg.querySelector('.marker')).not.toBeNull();
  });
});

describe('size and position', () => {
  it('reaches one cell\'s radius from its middle when it is a single cell', () => {
    expect(makeGroup('sasha').reach()).toBeCloseTo(R * UNIT);
  });

  it('reaches to the edge of its farthest cell as it grows', () => {
    const group = makeGroup('sasha', { x: 40, y: -10 });
    grow(group, 5);
    const farthest = Math.max(...cellCenters(group).map((c) => distance(c, [40, -10])));
    expect(group.reach()).toBeCloseTo(farthest + R * UNIT);
    expect(group.reach()).toBeGreaterThan(R * UNIT);
  });

  it('is drawn where it is in the dish, flipped to face the way it is going', () => {
    const group = makeGroup('sasha', { x: -25, y: 60 });
    group.facing = -1;
    group.place();
    expect(group.mover.style.transform).toBe('translate(-25px, 60px) scaleX(-1)');
  });
});

describe('an offspring cell budding', () => {
  it('adds the daughter to its own group, next to the cell that divided', () => {
    const group = makeGroup('sasha');
    grow(group, 3);
    const before = cellCenters(group);
    const [cx, cy] = before[2];
    expect(group.divide([group], DISH_RADIUS, [], [cx, cy])).toBeNull();
    expect(group.cellCount()).toBe(4);
    group.update(1);
    const newest = cellCenters(group).find((c) => before.every((b) => distance(b, c) > 0.01));
    expect(distance(newest, [cx, cy])).toBeLessThan(2 * SPACING * UNIT);
  });

  it('starts the daughter sliding in from the cell that divided', () => {
    const group = makeGroup('sasha');
    grow(group, 2);
    const [ex, ey] = group.body()[1];
    group.divide([group], DISH_RADIUS, [], [ex, ey]);
    group.update(0);
    const centers = cellCenters(group);
    // The new cell starts on top of the cell that divided...
    expect(centers.some(([x, y]) => distance([x, y], [ex, ey]) < 0.01 &&
      centers.filter((c) => distance(c, [ex, ey]) < 0.01).length === 2)).toBe(true);
    // ...and ends up next to it.
    group.update(1);
    const newest = cellCenters(group)[2];
    expect(distance(newest, [ex, ey])).toBeLessThan(2 * SPACING * UNIT);
  });

  it('starts a new group at the cell that divided when its own group is full', () => {
    const group = makeGroup('sasha');
    grow(group, GAME.GROUP_CAP);
    const [cx, cy] = group.body()[0];
    const child = group.divide([group], DISH_RADIUS, [], [cx, cy]);
    expect(child).not.toBeNull();
    expect([child.x, child.y]).toEqual([cx, cy]);
    expect(child.isPlayer).toBe(false);
    expect(group.cellCount()).toBe(GAME.GROUP_CAP);
  });
});

describe('antifungal disks', () => {
  // A disk to the right of a cell at the center, as the game stores it
  // (fractions of the dish radius), with a zone of inhibition around it. The
  // usual spot for a new cell on that side is just clear of the disk itself
  // but inside its zone, so the zone is the only thing keeping a cell out.
  const ZONE = 0.045;
  const clearOfDisk = SPACING * UNIT + (GAME.DISK_RADIUS + ZONE / 2) * DISH_RADIUS + CELL_PX / 2;
  const diskRight = { fx: clearOfDisk / DISH_RADIUS, fy: 0, r: GAME.DISK_RADIUS, zone: ZONE };

  it('keeps every cell it does attach clear of the disk and its zone', () => {
    const reach = (diskRight.r + ZONE) * DISH_RADIUS + CELL_PX / 2;
    const diskCenter = [diskRight.fx * DISH_RADIUS, 0];
    for (let angle = 0; angle < 6.28; angle += 0.4) {
      const group = makeGroup('sasha');
      grow(group, 3);
      const spot = group.attachSpot(Math.cos(angle) * 50, Math.sin(angle) * 50, [diskRight], DISH_RADIUS);
      if (spot) expect(distance(spot.world, diskCenter)).toBeGreaterThanOrEqual(reach);
    }
  });

  it('starts a new group instead when the only spots are on a disk', () => {
    const group = makeGroup('sasha');
    const player = makeGroup('sasha', { isPlayer: true, x: 20 });
    const covering = { fx: 0, fy: 0, r: 0.5 };
    expect(group.attachSpot(20, 0, [covering], DISH_RADIUS)).toBeNull();
    expect(player.divide([group], DISH_RADIUS, [covering])).not.toBeNull();
    expect(group.cellCount()).toBe(1);
  });
});

describe('a daughter cell', () => {
  // The size of each cell's oval, as a fraction of a full-grown cell.
  const sizes = (group) => [...group.svg.querySelectorAll('.cell-body')]
    .map((oval) => Number(oval.getAttribute('rx')) / R);
  const smallest = (group) => Math.min(...sizes(group));

  it('starts at a quarter of full size and grows slowly, after she has slid into place', () => {
    const group = makeGroup('sasha');
    const player = makeGroup('sasha', { isPlayer: true, x: 30 });
    player.divide([group], DISH_RADIUS);
    group.update(0);
    expect(smallest(group)).toBeCloseTo(0.25);
    group.update(GAME.DIVIDE_MS / 1000); // the slide is done...
    expect(group.moveFor).toBeNull();
    expect(smallest(group)).toBeLessThan(0.75); // ...but she's still small
    group.update(1.5);
    expect(smallest(group)).toBeCloseTo(1);
  });

  it('starts small even when she starts a new group of her own', () => {
    const player = makeGroup('sasha', { isPlayer: true });
    const child = player.divide([], DISH_RADIUS);
    child.update(0); // the game sizes a new group before it's first drawn
    expect(sizes(child)).toEqual([0.25]);
    child.update(0.75);
    expect(sizes(child)[0]).toBeCloseTo(0.625);
    child.update(5);
    expect(sizes(child)).toEqual([1]);
  });

  it("leaves the cells that are already grown at full size", () => {
    const group = makeGroup('sasha');
    grow(group, 3);
    group.update(5); // let them all grow up
    const player = makeGroup('sasha', { isPlayer: true, x: 30 });
    player.divide([group], DISH_RADIUS);
    group.update(0);
    expect(sizes(group).filter((size) => size === 1)).toHaveLength(3);
  });

  it('is a little oval, a bit wider than it is tall', () => {
    const oval = makeGroup('sasha').svg.querySelector('.cell-body');
    expect(Number(oval.getAttribute('ry'))).toBeLessThan(Number(oval.getAttribute('rx')));
  });
});

describe("the player's bud", () => {
  const bud = (player) => player.svg.querySelector('.bud');
  const budSize = (player) => Number(bud(player).getAttribute('rx')) / R;
  const budCenter = (player) => {
    const [, x, y] = bud(player).getAttribute('transform').match(/translate\((\S+) (\S+)\)/).map(Number);
    return [x, y];
  };

  it("isn't there until she starts one", () => {
    const player = makeGroup('sasha', { isPlayer: true });
    expect(bud(player)).toBeNull();
    expect(player.budReady()).toBe(false);
  });

  it('swells on her side, joined to her at a neck, until it is ready to pinch off', () => {
    const player = makeGroup('sasha', { isPlayer: true });
    player.startBud();
    player.update(0);
    expect(budSize(player)).toBeCloseTo(0.25);
    // Drawn behind her, and overlapping her outline a little.
    expect(player.svg.firstElementChild.classList.contains('bud')).toBe(true);
    const gap = Math.hypot(...budCenter(player));
    expect(gap).toBeGreaterThan(R * 0.8);
    expect(gap).toBeLessThan(R + R * budSize(player));
    expect(player.budReady()).toBe(false);

    player.update(0.35);
    expect(budSize(player)).toBeCloseTo(0.4);
    player.update(0.35);
    expect(budSize(player)).toBeCloseTo(0.55);
    expect(player.budReady()).toBe(true);
    player.update(1);
    expect(budSize(player)).toBeCloseTo(0.55); // it doesn't keep growing on her
  });

  it("keeps the same bud if she's asked to start one again", () => {
    const player = makeGroup('sasha', { isPlayer: true });
    player.startBud();
    const first = player.budding;
    player.update(0.2);
    player.startBud();
    expect(player.budding).toBe(first);
  });

  it("makes room in her drawing for the bud, and doesn't count it as part of her body", () => {
    const player = makeGroup('sasha', { isPlayer: true });
    const width = player.mover.style.width;
    const body = player.body();
    player.startBud();
    player.budding.angle = 0; // pointing right, so she gets wider
    player.update(1);
    expect(parseFloat(player.mover.style.width)).toBeGreaterThan(parseFloat(width));
    expect(player.body()).toHaveLength(1);
    expect(player.body()[0][2]).toBeCloseTo(body[0][2]);
  });

  it('pinches off into a daughter where the bud was, as big as the bud, and leaves her round again', () => {
    const player = makeGroup('sasha', { isPlayer: true, x: 20, y: -10 });
    player.startBud();
    player.update(1);
    const spot = player.budSpot();
    const child = player.divide([], DISH_RADIUS);
    child.update(0);
    expect(bud(player)).toBeNull();
    expect(player.budding).toBeNull();
    expect([child.x, child.y]).toEqual(spot);
    expect(Number(child.svg.querySelector('.cell-body').getAttribute('rx')) / R).toBeCloseTo(0.55);
  });

  it('works out where the bud is when she faces left', () => {
    const player = makeGroup('sasha', { isPlayer: true });
    player.startBud();
    player.budding.angle = 0; // pointing right in her own drawing
    player.update(1);
    expect(player.budSpot()[0]).toBeGreaterThan(0);
    player.facing = -1;
    expect(player.budSpot()[0]).toBeLessThan(0);
  });

  it('sends a daughter that joins a cluster in from the bud, at the bud\'s size', () => {
    const group = makeGroup('sasha', { x: 30 });
    const player = makeGroup('sasha', { isPlayer: true });
    player.startBud();
    player.update(1);
    player.divide([group], DISH_RADIUS);
    group.update(0);
    const sizes = [...group.svg.querySelectorAll('.cell-body')].map((oval) => Number(oval.getAttribute('rx')) / R);
    expect(Math.min(...sizes)).toBeCloseTo(0.55);
  });
});

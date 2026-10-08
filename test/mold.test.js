// mold.js: Fumi grows instead of swimming. Her lead tip is steered, Branch
// adds tips that share her stored growth, nutrients refill it, her threads'
// lengths are her cells, and a tip that touches an antifungal dies.
import { describe, expect, it } from 'vitest';
import { GAME } from '../public/game/config.js';
import { makeMold } from '../public/game/mold.js';

const M = GAME.MOLD;
const close = (a, b) => expect(a).toBeCloseTo(b, 6);
const UP = -Math.PI / 2;

describe('Fumi, a growing mold', () => {
  it('starts as one cell, a spore in the middle, with one tip heading up', () => {
    const mold = makeMold();
    expect(mold.cellCount()).toBe(1);
    expect(mold.threads).toHaveLength(1);
    expect(mold.lead.tip).toEqual([0, 0]);
    expect(mold.lead.angle).toBe(UP);
    expect(mold.growth).toBe(M.START_GROWTH);
    expect(mold.alive()).toBe(true);
  });

  it('grows her lead tip straight ahead, using up stored growth', () => {
    const mold = makeMold({ angle: 0 });
    mold.update(0.1);
    close(mold.lead.tip[0], M.TIP_SPEED * 0.1);
    close(mold.lead.length, M.TIP_SPEED * 0.1);
    close(mold.growth, M.START_GROWTH - M.TIP_SPEED * 0.1);
  });

  it('only creeps, slowly, once her stored growth is used up', () => {
    const mold = makeMold({ angle: 0 });
    mold.growth = 0;
    mold.update(1);
    close(mold.lead.tip[0], M.CREEP_SPEED);
    expect(mold.growth).toBe(0);
  });

  it("doesn't grow on a frame with no time in it", () => {
    const mold = makeMold();
    mold.update(0);
    expect(mold.lead.tip).toEqual([0, 0]);
  });

  it('gets one more cell for every bit of thread', () => {
    const mold = makeMold({ angle: 0 });
    mold.growth = 10;
    // Grow a little past 3 cells' worth, in small steps.
    const seconds = (M.CELL_LENGTH * 3.2) / M.TIP_SPEED;
    for (let i = 0; i < 100; i++) mold.update(seconds / 100);
    expect(mold.cellCount()).toBe(4);
  });

  it('keeps points along her thread, spaced out', () => {
    const mold = makeMold({ angle: 0 });
    mold.growth = 10;
    for (let i = 0; i < 50; i++) mold.update(0.01);
    const { path } = mold.lead;
    expect(path.length).toBeGreaterThan(5);
    for (let i = 1; i < path.length; i++) {
      expect(Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])).toBeGreaterThan(M.POINT);
    }
  });
});

describe('steering', () => {
  it('turns her lead tip in a curve, never a sharp corner', () => {
    const mold = makeMold({ angle: 0 });
    mold.growth = 10;
    mold.update(0.05, Math.PI / 2); // steered straight down
    close(mold.lead.angle, (M.TIP_SPEED * 0.05) / M.TURN);
    for (let i = 0; i < 20; i++) mold.update(0.05, Math.PI / 2);
    close(mold.lead.angle, Math.PI / 2); // she comes around
  });

  it('turns the short way around', () => {
    const mold = makeMold({ angle: 0 });
    mold.growth = 10;
    mold.update(0.05, -0.1);
    expect(mold.lead.angle).toBeLessThan(0);
  });

  it('slides her lead tip along the rim instead of growing past it', () => {
    const mold = makeMold({ start: [M.RIM - 0.01, 0], angle: 0 });
    mold.growth = 10;
    for (let i = 0; i < 20; i++) mold.update(0.05);
    expect(Math.hypot(...mold.lead.tip)).toBeLessThanOrEqual(M.RIM + 1e-9);
    expect(mold.lead.length).toBeGreaterThan(0.2); // kept growing, around the rim
  });

  it('slides along the rim whichever way she was heading', () => {
    const mold = makeMold({ start: [M.RIM - 0.01, 0], angle: 0.3 });
    mold.growth = 10;
    mold.update(0.1);
    expect(Math.sin(mold.lead.angle)).toBeGreaterThan(0); // around clockwise (down on screen)
    const other = makeMold({ start: [M.RIM - 0.01, 0], angle: -0.3 });
    other.growth = 10;
    other.update(0.1);
    expect(Math.sin(other.lead.angle)).toBeLessThan(0);
  });
});

describe('branching', () => {
  it('sprouts a new tip from her lead, about 45 degrees off, on alternating sides', () => {
    const mold = makeMold({ angle: 0 });
    mold.growth = 10;
    mold.update(0.1);
    const a = mold.branch();
    expect(a.tip).toEqual(mold.lead.tip);
    close(Math.abs(a.angle), M.BRANCH_ANGLE);
    mold.update(M.BRANCH_COOLDOWN);
    const b = mold.branch();
    close(a.angle, -b.angle);
    expect(mold.threads).toHaveLength(3);
    expect(mold.lead).toBe(mold.threads[0]); // her face stays on her lead
  });

  it("can't branch again right away", () => {
    const mold = makeMold();
    expect(mold.branch()).not.toBeNull();
    expect(mold.branch()).toBeNull();
  });

  it('shares her stored growth among all her tips', () => {
    const mold = makeMold({ angle: 0 });
    mold.growth = 1;
    mold.branch();
    mold.update(0.1);
    close(mold.growth, 1 - 2 * M.TIP_SPEED * 0.1);
    close(mold.threads[1].length, M.TIP_SPEED * 0.1);
  });

  it('splits what little is left evenly between her tips', () => {
    const mold = makeMold({ angle: 0 });
    mold.growth = 0.01;
    mold.branch();
    mold.update(1);
    close(mold.threads[1].length, 0.005);
    expect(mold.growth).toBe(0);
  });

  it("can't branch with no stored growth to grow the new tip", () => {
    const mold = makeMold();
    mold.growth = 0;
    expect(mold.canBranch()).toBe(false);
    expect(mold.branch()).toBeNull();
    mold.feed(1);
    expect(mold.canBranch()).toBe(true);
  });

  it('stops a branch at the rim', () => {
    const mold = makeMold({ start: [M.RIM - 0.01, 0], angle: Math.PI / 2 });
    mold.growth = 10;
    const branch = mold.branch();
    branch.angle = 0; // straight at the rim
    mold.update(0.1);
    expect(branch.stopped).toBe(true);
    expect(mold.growing()).not.toContain(branch);
  });
});

describe('eating', () => {
  it('stores growth from each nutrient, enough for every growing tip', () => {
    const mold = makeMold();
    mold.growth = 0;
    mold.feed(2);
    close(mold.growth, 2 * M.NUTRIENT_GROWTH);
    mold.branch();
    mold.growth = 0;
    mold.feed(1);
    close(mold.growth, 2 * M.NUTRIENT_GROWTH);
  });
});

describe('antifungals', () => {
  it('kill just the tip that touched one; the thread behind it stays', () => {
    const mold = makeMold();
    const branch = mold.branch();
    mold.kill(branch);
    expect(branch.alive).toBe(false);
    expect(mold.threads).toContain(branch);
    expect(mold.growing()).not.toContain(branch);
    expect(mold.alive()).toBe(true);
  });

  it('move her face to her newest live tip when her lead dies', () => {
    const mold = makeMold();
    mold.growth = 10;
    const first = mold.lead;
    const a = mold.branch();
    mold.update(M.BRANCH_COOLDOWN);
    const b = mold.branch();
    b.stopped = true; // it had reached the rim
    mold.kill(first);
    expect(mold.lead).toBe(b);
    expect(b.stopped).toBe(false); // her lead keeps growing
    mold.kill(b);
    expect(mold.lead).toBe(a);
  });

  it("can't branch from a dead lead, and she's done when every tip is dead", () => {
    const mold = makeMold();
    mold.kill(mold.lead);
    expect(mold.alive()).toBe(false);
    expect(mold.branch()).toBeNull();
    mold.update(1);
    expect(mold.lead.length).toBe(0);
  });
});

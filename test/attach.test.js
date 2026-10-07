import { describe, expect, it } from 'vitest';
import { clusterSpot, R, SPACING, wobble } from '../public/game/attach.js';

const cell = (x, y) => ({ x, y });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Grow a cluster the way the game does: keep attaching a new cell at the spot
// clusterSpot picks, approaching from a series of different directions.
function growCluster(size, twist) {
  const cells = [cell(0, 0)];
  for (let i = 1; i < size; i++) {
    const angle = i * 2.4; // approach from a different side each time
    const spot = clusterSpot(cells, twist, Math.cos(angle) * 200, Math.sin(angle) * 200);
    cells.push(cell(spot.x, spot.y));
  }
  return cells;
}

describe('wobble', () => {
  it('gives the same value for the same inputs', () => {
    expect(wobble(3, 1)).toBe(wobble(3, 1));
  });

  it('stays between -1 and 1', () => {
    for (let k = 0; k < 50; k++) {
      for (let salt = 0; salt < 5; salt++) {
        expect(Math.abs(wobble(k, salt))).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('clusterSpot', () => {
  it('returns nothing for an empty cluster', () => {
    expect(clusterSpot([], 0, 10, 10)).toBeNull();
  });

  it('puts the new cell touching a lone cell', () => {
    const only = cell(0, 0);
    const spot = clusterSpot([only], 0, 100, 0);
    expect(distance(spot, only)).toBeCloseTo(SPACING * 0.95);
  });

  it('grows on the side facing the player', () => {
    expect(clusterSpot([cell(0, 0)], 0, 100, 0).x).toBeGreaterThan(0);
    expect(clusterSpot([cell(0, 0)], 0, -100, 0).x).toBeLessThan(0);
    expect(clusterSpot([cell(0, 0)], 0, 0, 100).y).toBeGreaterThan(0);
    expect(clusterSpot([cell(0, 0)], 0, 0, -100).y).toBeLessThan(0);
  });

  it('tucks a new cell into a nook touching two cells instead of sticking out', () => {
    const pair = [cell(0, 0), cell(SPACING * 0.95, 0)];
    const spot = clusterSpot(pair, 0, SPACING / 2, -300);
    expect(distance(spot, pair[0])).toBeLessThan(SPACING * 1.15);
    expect(distance(spot, pair[1])).toBeLessThan(SPACING * 1.15);
  });

  it('never places a cell on top of another as a cluster grows to 8', () => {
    for (const twist of [0, 0.7, 1.9, 3.3, 5.1]) {
      const cells = growCluster(8, twist);
      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
          expect(distance(cells[i], cells[j])).toBeGreaterThanOrEqual(R * 1.5);
        }
      }
    }
  });

  it('keeps a grown cluster bunched up rather than strung out', () => {
    const cells = growCluster(8, 0.7);
    // Every cell touches at least one other.
    for (const c of cells) {
      const neighbors = cells.filter((o) => o !== c && distance(o, c) < SPACING * 1.15);
      expect(neighbors.length).toBeGreaterThan(0);
    }
    // And the whole bunch stays compact: well inside eight cells end to end.
    const widest = Math.max(...cells.flatMap((a) => cells.map((b) => distance(a, b))));
    expect(widest).toBeLessThan(7 * SPACING * 0.6);
  });

  it('never picks a spot that is ruled out', () => {
    const notBelow = (x, y) => y <= 0; // e.g. an antifungal disk below
    const cells = growCluster(5, 0.7);
    for (let angle = 0; angle < 6.28; angle += 0.5) {
      const spot = clusterSpot(cells, 0.7, Math.cos(angle) * 200, Math.sin(angle) * 200, notBelow);
      expect(spot.y).toBeLessThanOrEqual(0);
    }
  });

  it('returns null when every spot is ruled out', () => {
    expect(clusterSpot([cell(0, 0)], 0, 10, 10, () => false)).toBeNull();
  });

  it('does not change the cells it is given', () => {
    const cells = [cell(0, 0), cell(SPACING, 0)];
    const before = JSON.stringify(cells);
    clusterSpot(cells, 1.2, 50, 50);
    expect(JSON.stringify(cells)).toBe(before);
  });
});

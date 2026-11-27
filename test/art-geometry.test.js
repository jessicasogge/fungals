import { describe, expect, it } from 'vitest';
import { around, box, crowding, frameBox, spill, union, worstSpill } from '../scripts/art-geometry.js';

describe('the art check geometry', () => {
  it('reads a viewBox as a box', () => {
    expect(frameBox('12 14 184 184')).toEqual(box(12, 14, 196, 198));
    expect(frameBox(' -6,-4 216 216 ')).toEqual(box(-6, -4, 210, 212));
  });

  it('measures how far art spills past each side of its frame', () => {
    const frame = box(0, 0, 100, 100);
    expect(spill(box(10, 10, 90, 90), frame)).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    expect(spill(box(-3, 5, 104, 101), frame)).toEqual({ left: 3, top: 0, right: 4, bottom: 1 });
    expect(worstSpill(box(-3, 5, 104, 101), frame)).toEqual({ side: 'right', by: 4 });
    expect(worstSpill(box(10, 10, 90, 90), frame)).toBeNull();
  });

  it('boxes up points, padded by half a stroke, and boxes', () => {
    expect(around([{ x: 1, y: 5 }, { x: 4, y: 2 }], 1)).toEqual(box(0, 1, 5, 6));
    expect(around([])).toBeNull();
    expect(union([box(0, 0, 1, 1), null, box(3, -2, 4, 0)])).toEqual(box(0, -2, 4, 1));
    expect(union([null])).toBeNull();
  });

  it('finds the points of a shape that come too close to another, edge to edge', () => {
    const eye = { points: [{ x: 0, y: 0 }], half: 0 };
    const droplet = { points: [{ x: 5, y: 0 }, { x: 9, y: 0 }], half: 1 };
    // 5 apart, less a stroke half of 1: 4 from edge to edge.
    expect(crowding(droplet, eye, 4)).toEqual([{ x: 5, y: 0 }]);
    expect(crowding(droplet, eye, 3.9)).toEqual([]);
    expect(crowding(eye, droplet, 4)).toEqual([{ x: 0, y: 0 }]);
  });
});

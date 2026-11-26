// Geometry for the art check (scripts/check-art.mjs): boxes and points in
// a gal's drawing units (her frame's viewBox), so the checks read the same
// whatever size the browser draws her.

// A box: { x0, y0, x1, y1 }, with x0 <= x1 and y0 <= y1.
export const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });

// A frame's viewBox string ('12 14 184 184') as a box.
export function frameBox(viewBox) {
  const [x, y, w, h] = viewBox.trim().split(/[\s,]+/).map(Number);
  return box(x, y, x + w, y + h);
}

// How far `art` reaches past each side of `frame`, 0 where it stays inside.
export function spill(art, frame) {
  return {
    left: Math.max(0, frame.x0 - art.x0),
    top: Math.max(0, frame.y0 - art.y0),
    right: Math.max(0, art.x1 - frame.x1),
    bottom: Math.max(0, art.y1 - frame.y1),
  };
}

// The worst spill, and which side it's on (null when nothing spills).
export function worstSpill(art, frame) {
  const sides = Object.entries(spill(art, frame)).filter(([, by]) => by > 0);
  if (!sides.length) return null;
  const [side, by] = sides.reduce((a, b) => (b[1] > a[1] ? b : a));
  return { side, by };
}

// The smallest box around some points ({ x, y }), each one a disc of
// radius `pad` (half a stroke's width), or null for no points.
export function around(points, pad = 0) {
  if (!points.length) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return box(Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad);
}

// The smallest box around some boxes, or null for none.
export function union(boxes) {
  const real = boxes.filter(Boolean);
  if (!real.length) return null;
  return box(
    Math.min(...real.map((b) => b.x0)), Math.min(...real.map((b) => b.y0)),
    Math.max(...real.map((b) => b.x1)), Math.max(...real.map((b) => b.y1)),
  );
}

// The points of shape `a` that come within `gap` of shape `b`, edge to
// edge (none if they keep their distance). A shape is points along its
// outline and half its stroke's width: { points, half }.
export function crowding(a, b, gap) {
  return a.points.filter((p) => b.points.some((q) => Math.hypot(p.x - q.x, p.y - q.y) <= a.half + b.half + gap));
}

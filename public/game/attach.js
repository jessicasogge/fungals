// Where a new bud attaches to a cluster of yeast cells. Plain math on cell
// positions (in SVG units, relative to the group's origin), with no page
// access, so it can be tested on its own.

export const R = 10; // cell radius in SVG units
export const SPACING = R * 1.75; // center to center, for cells that touch

// A fixed pseudo-random value from -1 to 1, so shapes vary without jitter.
export const wobble = (k, salt) => Math.sin(k * 12.9898 + salt * 78.233);

// Where a new cell would attach to a cluster: an open spot touching the
// cluster, on the side facing (px, py), preferring nooks that touch several
// cells so the cluster fills out into a bunch instead of a line. `twist` is
// the cluster's own packing angle. `allowed(x, y)` can rule spots out (for
// example, spots on an antifungal disk).
export function clusterSpot(cells, twist, px, py, allowed = () => true) {
  const reach = SPACING * 0.95; // how far a new cell sits from one it touches
  let best = null;

  function consider(x, y) {
    if (!allowed(x, y)) return;
    if (cells.some((o) => Math.hypot(o.x - x, o.y - y) < R * 1.5)) return;
    const touching = cells.filter((o) => Math.hypot(o.x - x, o.y - y) < SPACING * 1.15).length;
    const distance = Math.hypot(x - px, y - py);
    const score = distance - touching * SPACING * 1.5;
    if (!best || score < best.score) best = { x, y, atStart: false, distance, score };
  }

  // Six spots around each cell, each turned a little so clusters look organic.
  cells.forEach((c, i) => {
    for (let k = 0; k < 6; k++) {
      const angle = twist + (k * Math.PI) / 3 + wobble(k, i) * 0.3;
      consider(c.x + Math.cos(angle) * reach, c.y + Math.sin(angle) * reach);
    }
  });

  // The nooks between each pair of neighboring cells: the two spots that
  // touch both. The turned spots above can miss these, and they're what lets
  // a cluster fill in instead of growing arms.
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i];
      const b = cells[j];
      const gap = Math.hypot(b.x - a.x, b.y - a.y);
      if (gap === 0 || gap >= 2 * reach) continue;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const rise = Math.sqrt(reach * reach - (gap / 2) ** 2);
      const nx = -(b.y - a.y) / gap;
      const ny = (b.x - a.x) / gap;
      consider(midX + nx * rise, midY + ny * rise);
      consider(midX - nx * rise, midY - ny * rise);
    }
  }

  return best;
}

import { touchesDisk } from './antifungal.js';
import { clusterSpot, R } from './attach.js';
import { GAME } from './config.js';
import { idlePose, newMover } from './mover.js';
import { coaster } from './physics.js';

// A budding yeast (Sasha, Candi, Olive). The player is always a single cell. Each
// time she eats, a small bud swells out of her side, pinches off, and the
// daughter keeps growing until she's full size. (Offspring that eat bud
// too, without the swelling first.) Daughters stay stuck together in little clusters, up to
// GROUP_CAP cells, the way budding yeast often does on a plate. A cluster
// grows on the side facing the cell that budded, so the player builds bunches
// wherever she lingers.
export function yeastGroup({ mover, svg, species, isPlayer }) {
  const CELL_SIZE = 5; // one cell's width, as a percent of the dish
  const OUTLINE = 1.7; // each cell's outline width, in SVG units
  const { colors } = species;

  const group = {
    mover,
    svg,
    isPlayer,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    // Cells in SVG units around the group's origin.
    cells: [{ x: 0, y: 0, fromX: 0, fromY: 0, toX: 0, toY: 0, face: isPlayer }],
    moveFor: null, // ms into sliding a new cell into place, or null
    // The player's bud, while it swells on her side before pinching off:
    // { ms, angle }, how long it's been growing and which way it points.
    budding: null,
    twist: Math.random() * Math.PI * 2, // each cluster packs at its own angle
    cellCount: () => group.cells.length,
  };

  // Yeast cells are a little oval, each tipped its own way.
  const OVAL = 0.86; // height over width
  // A daughter starts as a bud BUD_START of full size. On the player it
  // swells on her side for BUD_SWELL_MS, to BUD_PINCH of full size, then
  // pinches off. Every daughter then grows to full size at a steady pace,
  // taking GROW_MS from BUD_START to full, so you can watch her grow.
  const BUD_START = 0.25;
  const BUD_PINCH = 0.55;
  const BUD_SWELL_MS = 700;
  const GROW_MS = 1500;

  // How big the player's bud is right now, as a fraction of a full cell.
  function budSize() {
    const t = Math.min(1, group.budding.ms / BUD_SWELL_MS);
    return BUD_START + (BUD_PINCH - BUD_START) * t;
  }

  // Where the player's bud is, in SVG units: just outside her outline in the
  // bud's direction, overlapping it a little so the two look joined at a neck.
  function budCenter() {
    const { angle } = group.budding;
    const r = R * budSize();
    const sin = Math.sin(angle);
    const edge = R * (1 - (1 - OVAL) * sin * sin); // roughly her oval's edge
    const d = edge + r * 0.55;
    return [Math.cos(angle) * d, sin * d, r];
  }

  // Half the drawing's width and height in SVG units, centered on (0, 0).
  function extent() {
    let mx = 0;
    let my = 0;
    for (const c of group.cells) {
      mx = Math.max(mx, Math.abs(c.x) + R);
      my = Math.max(my, Math.abs(c.y) + R);
    }
    if (group.budding) {
      const [bx, by, br] = budCenter();
      mx = Math.max(mx, Math.abs(bx) + br);
      my = Math.max(my, Math.abs(by) + br);
    }
    return [mx + 2, my + 2];
  }

  const pxPerUnit = () => mover.offsetWidth / (2 * extent()[0]);

  // Convert between dish pixels (from the dish center) and this group's units.
  function toLocal(wx, wy) {
    const unit = pxPerUnit();
    return [((wx - group.x) / unit) * group.facing, (wy - group.y) / unit];
  }
  function toWorld(lx, ly) {
    const unit = pxPerUnit();
    return [group.x + lx * unit * group.facing, group.y + ly * unit];
  }

  function cellBody(c) {
    const paint = `fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="${OUTLINE}"`;
    const size = c.grow ?? 1;
    return `<ellipse class="${c.bud ? 'bud' : 'cell-body'}" cx="0" cy="0" rx="${R * size}" ry="${R * OVAL * size}" ` +
      `transform="translate(${c.x} ${c.y}) rotate(${c.tilt ?? 0})" ${paint} />`;
  }

  function cellMarkup(c) {
    let out =
      cellBody(c) +
      `<circle cx="${c.x - 2.7}" cy="${c.y - 3.2}" r="${1.5 * (c.grow ?? 1)}" fill="${colors.highlight}" />`;
    if (c.face) {
      out +=
        `<g transform="translate(${c.x} ${c.y})">` +
        `<circle cx="-3.6" cy="0" r="2" fill="${colors.dark}" />` +
        `<circle cx="3.6" cy="0" r="2" fill="${colors.dark}" />` +
        '<circle cx="-3" cy="-0.6" r="0.75" fill="white" />' +
        '<circle cx="4.2" cy="-0.6" r="0.75" fill="white" />' +
        '<ellipse cx="-6.3" cy="3.8" rx="1.8" ry="1.2" fill="#f9a8d4" opacity="0.9" />' +
        '<ellipse cx="6.3" cy="3.8" rx="1.8" ry="1.2" fill="#f9a8d4" opacity="0.9" />' +
        `<path d="M-2 3.8 Q0 6 2 3.8" stroke="${colors.dark}" stroke-width="1.2" fill="none" stroke-linecap="round" />` +
        '</g>';
    }
    return out;
  }

  // The player's swelling bud, drawn behind her so her outline crosses it,
  // like the pals' pictures.
  function budMarkup() {
    if (!group.budding) return '';
    const [bx, by] = budCenter();
    return cellMarkup({ x: bx, y: by, grow: budSize(), tilt: 0, bud: true });
  }

  function draw() {
    const [mx, my] = extent();
    svg.setAttribute('viewBox', `${-mx} ${-my} ${2 * mx} ${2 * my}`);
    mover.style.width = `${(mx / R) * CELL_SIZE}%`;
    // Cells higher up sit behind lower ones.
    const order = [...group.cells].sort((a, b) => a.y - b.y);
    svg.innerHTML = budMarkup() + order.map(cellMarkup).join('');
  }

  Object.assign(group, {
    reach() {
      let farthest = 0;
      for (const c of group.cells) farthest = Math.max(farthest, Math.hypot(c.x, c.y) + R);
      return farthest * pxPerUnit();
    },
    // Redraw only while something is changing (a new cell sliding into
    // place, a daughter growing, the player's bud swelling); a still group
    // looks the same every frame, and with hundreds of cells redrawing them
    // all slows the game down.
    update(seconds) {
      const ms = seconds * 1000;
      let changed = false;
      if (group.moveFor !== null) {
        group.moveFor += ms;
        const t = Math.min(1, group.moveFor / GAME.DIVIDE_MS);
        const ease = 1 - (1 - t) ** 3;
        for (const c of group.cells) {
          // At the end, land exactly on the spot (the sum can be a hair off).
          c.x = t >= 1 ? c.toX : c.fromX + (c.toX - c.fromX) * ease;
          c.y = t >= 1 ? c.toY : c.fromY + (c.toY - c.fromY) * ease;
        }
        if (t >= 1) group.moveFor = null;
        changed = true;
      }
      for (const c of group.cells) {
        if (c.grow === undefined || c.grow >= 1) continue;
        c.grow = Math.min(1, c.grow + (ms / GROW_MS) * (1 - BUD_START));
        changed = true;
      }
      if (group.budding) {
        group.budding.ms += ms;
        changed = true;
      }
      if (changed) draw();
    },
    // Start a bud swelling on the player's side (if one isn't already
    // growing): from the top for a pal who always buds from the same end
    // (Olive), or else pointing a random way.
    startBud() {
      const angle = species.budsFromOneEnd ? -Math.PI / 2 : Math.random() * Math.PI * 2;
      group.budding ??= { ms: 0, angle };
    },
    // Whether her bud has swelled enough to pinch off.
    budReady() {
      return group.budding !== null && group.budding.ms >= BUD_SWELL_MS;
    },
    // Where her bud is in the dish, for the daughter to start from.
    budSpot() {
      const [bx, by] = budCenter();
      return toWorld(bx, by);
    },
    // Remove the cells at these places in the list (the same order as body()),
    // when they pop. The others stay exactly where they are.
    removeCells(indexes) {
      const gone = new Set(indexes);
      group.cells = group.cells.filter((_, i) => !gone.has(i));
      draw();
    },
    place() {
      mover.style.transform = `translate(${group.x}px, ${group.y}px) scaleX(${group.facing})`;
    },
    // Every cell's circle, used to tell whether the group touches a nutrient
    // or an antifungal disk.
    // Each circle includes the cell's outline. The player's follows its idle
    // animation, so touches match the screen.
    body() {
      const unit = pxPerUnit();
      const pose = isPlayer ? idlePose(svg) : (x, y, r) => [x, y, r];
      return group.cells.map((c) => {
        const [x, y, r] = pose(c.x * unit, c.y * unit, (R + OUTLINE / 2) * unit);
        return [group.x + x * group.facing, group.y + y, r];
      });
    },
    // Where a new cell would join this group if it came from (wx, wy) in the
    // dish, or null if the group is full or every open spot is on a disk.
    attachSpot(wx, wy, disks = [], dishRadius = 0) {
      if (group.cells.length >= GAME.GROUP_CAP) return null;
      const [px, py] = toLocal(wx, wy);
      // Spots on or right next to an antifungal disk are off-limits. Measure
      // each cell the same way body() does (with its outline), or a new cell
      // can land a hair inside the clear space and get shoved right away.
      const cellRadius = (R + OUTLINE / 2) * pxPerUnit();
      const allowed = (x, y) => {
        const [sx, sy] = toWorld(x, y);
        return !disks.some((disk) =>
          touchesDisk(disk, [[sx, sy, cellRadius]], dishRadius));
      };
      const spot = clusterSpot(group.cells, group.twist, px, py, allowed);
      if (!spot) return null;
      spot.world = toWorld(spot.x, spot.y);
      return spot;
    },
    // Slide a new cell from (wx, wy) in the dish into `spot`, starting at
    // `grow` of full size.
    addCell(spot, wx, wy, grow = BUD_START) {
      const [fx, fy] = toLocal(wx, wy);
      for (const c of group.cells) {
        c.fromX = c.toX = c.x;
        c.fromY = c.toY = c.y;
      }
      const cell = {
        x: fx, y: fy, fromX: fx, fromY: fy, toX: spot.x, toY: spot.y, face: false,
        grow, tilt: Math.round(Math.random() * 180),
      };
      if (spot.atStart) group.cells.unshift(cell);
      else group.cells.push(cell);
      group.moveFor = 0;
    },
    // A cell buds: the daughter joins the nearest cluster that
    // has room and is close enough (and not onto an antifungal disk), or else
    // starts a new one. `from` is where she starts in the dish: the player's
    // bud, if one has swelled on her side, or else the cell in an offspring
    // group that ate a nutrient. She starts as small as the bud was.
    // Returns the new group, or null if the daughter joined one.
    divide(others, dishRadius, disks = [], from = group.budding ? group.budSpot() : [group.x, group.y]) {
      const [fx, fy] = from;
      const grow = group.budding ? budSize() : BUD_START;
      if (group.budding) {
        // Pinched off: the bud is the daughter now.
        group.budding = null;
        draw();
      }
      let best = null;
      for (const other of others) {
        const spot = other.attachSpot?.(fx, fy, disks, dishRadius);
        if (!spot) continue;
        const distance = Math.hypot(spot.world[0] - fx, spot.world[1] - fy);
        if (distance > GAME.SNAP_REACH * dishRadius) continue;
        if (!best || distance < best.distance) best = { other, spot, distance };
      }
      if (best) {
        best.other.addCell(best.spot, fx, fy, grow);
        return null;
      }
      const copy = svg.cloneNode(false);
      const child = yeastGroup({ mover: newMover(copy), svg: copy, species, isPlayer: false });
      child.x = fx;
      child.y = fy;
      // She starts small and grows, like a daughter joining a cluster.
      Object.assign(child.cells[0], { grow, tilt: Math.round(Math.random() * 180) });
      const angle = Math.random() * Math.PI * 2;
      const burst = GAME.BURST_SPEED * dishRadius * 0.5;
      child.vx = Math.cos(angle) * burst;
      child.vy = Math.sin(angle) * burst;
      return child;
    },
  });

  group.coast = coaster(group);
  draw();
  return group;
}

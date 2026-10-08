import { GAME } from './config.js';
import { newMover } from './mover.js';

// A mold (Fumi) grows as threads called hyphae instead of budding. The player
// swims like the yeasts do, but leaves a thread behind her. Each nutrient
// she eats puts a wall (a septum) across her thread right where she ate, and
// each wall makes one more cell, the same pace as a yeast budding. Eating
// also sprouts a branch from that spot, about 45 degrees off the way she was
// going. A branch is an offspring group: it grows a short way on its own,
// and when it eats it gets a wall (a cell) too, but no branch. A branch that
// grows into an antifungal zone stops there (see stopInZone); the thread
// behind it stays.
//
// The threads are drawn on one canvas under everything else on the agar
// (see threadLayer); each group's mover only shows its tip.
export function hyphaGroup({ mover, svg, species, isPlayer, start = [0, 0], angle = 0 }) {
  const { colors } = species;
  const layer = threadLayer(mover.parentElement, colors);
  const dishRadius = () => (mover.parentElement?.clientWidth ?? 0) / 2;

  const group = {
    mover,
    svg,
    isPlayer,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    angle, // which way the tip is heading, in radians
    // The thread, as points in fractions of the dish radius; the tip itself
    // is always the live end.
    path: [start],
    tip: [...start],
    // Walls across the thread, each [x, y, angle]: where, and which way the
    // thread ran there. Each one is a cell.
    walls: [],
    // A branch grows this much farther, in fractions of the dish radius.
    budget: isPlayer ? 0 : GAME.BRANCH_LENGTH,
    stopped: false, // grew into a zone or the rim, or the level ended
    side: 1, // which side the next branch sprouts on
    // The player starts as one cell, the spore; a branch is part of the
    // cell it grew from until it gets a wall of its own.
    cellCount: () => (isPlayer ? 1 : 0) + group.walls.length,
    coast() {}, // threads don't slide
  };
  layer.add(group);

  // The tip: the player's has her face; a branch's is just a rounded end.
  svg.setAttribute('viewBox', '-12 -12 24 24');
  const paint = `fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.4"`;
  svg.innerHTML = `<circle class="tip" r="10" ${paint} />` + (isPlayer
    ? `<circle cx="-3.6" cy="-1" r="1.8" fill="${colors.dark}" />` +
      `<circle cx="3.6" cy="-1" r="1.8" fill="${colors.dark}" />` +
      `<path d="M-2 3 Q0 5 2 3" stroke="${colors.dark}" stroke-width="1.2" fill="none" stroke-linecap="round" />`
    : '');
  if (isPlayer) svg.style.animation = 'none'; // her tip stays on the end of her thread
  const size = isPlayer ? GAME.TIP_SIZE : GAME.HYPHA_WIDTH;
  mover.style.width = `${size * 50}%`;

  // Add the tip to the thread once it's far enough from the last point.
  function extend([x, y]) {
    if (x !== group.tip[0] || y !== group.tip[1]) group.angle = Math.atan2(y - group.tip[1], x - group.tip[0]);
    group.tip = [x, y];
    const [lx, ly] = group.path.at(-1);
    if (Math.hypot(x - lx, y - ly) > GAME.HYPHA_POINT) group.path.push([x, y]);
  }

  // A real hypha can't turn on a dime, so she turns in a curve: however
  // she's steered, her heading changes by at most so much for how far she
  // went (a turn no tighter than HYPHA_TURN). Her very first move can go any
  // way. Returns where she ends up, and moves her there.
  let started = false;
  function curve([x, y], radius) {
    const [tx, ty] = group.tip;
    const distance = Math.hypot(x - tx, y - ty);
    if (distance === 0) return [x, y];
    if (!started) {
      started = true;
      return [x, y];
    }
    const want = Math.atan2(y - ty, x - tx);
    const turn = Math.atan2(Math.sin(want - group.angle), Math.cos(want - group.angle));
    const most = distance / GAME.HYPHA_TURN;
    const angle = group.angle + Math.max(-most, Math.min(most, turn));
    let to = [tx + Math.cos(angle) * distance, ty + Math.sin(angle) * distance];
    // A curve can carry her past the rim; keep her (and her thread) inside.
    const rim = 1 - size / 2;
    const out = Math.hypot(...to);
    if (out > rim) to = [(to[0] * rim) / out, (to[1] * rim) / out];
    [group.x, group.y] = [to[0] * radius, to[1] * radius];
    return to;
  }

  // A branch grows on its own, straight ahead, until it runs out of length
  // or reaches the rim.
  function grow(seconds) {
    const step = Math.min(GAME.BRANCH_SPEED * seconds, group.budget);
    const nx = group.tip[0] + Math.cos(group.angle) * step;
    const ny = group.tip[1] + Math.sin(group.angle) * step;
    if (Math.hypot(nx, ny) > GAME.HYPHA_RIM) {
      group.stopped = true;
      return;
    }
    group.budget -= step;
    extend([nx, ny]);
  }

  Object.assign(group, {
    // The player's tip is kept inside the dish like a yeast; nothing pushes
    // against a branch.
    reach: () => (isPlayer ? (size / 2) * dishRadius() : 0),
    update(seconds) {
      const radius = dishRadius();
      if (isPlayer) {
        // She swims (game.js moves her); her thread follows.
        if (radius > 0) extend(curve([group.x / radius, group.y / radius], radius));
        layer.draw();
        return;
      }
      if (!group.stopped && !layer.frozen && group.budget > 0 && seconds > 0) grow(seconds);
      [group.x, group.y] = [group.tip[0] * radius, group.tip[1] * radius];
    },
    place() {
      mover.style.transform = `translate(${group.x}px, ${group.y}px)`;
    },
    // The tip, which is what eats, and what touches a zone. A branch that
    // stopped in a zone has nothing left to touch.
    body() {
      if (group.inZone) return [];
      return [[group.x, group.y, (size / 2) * dishRadius()]];
    },
    // A branch that grows into a zone stops right there, and its tip grays.
    stopInZone() {
      group.stopped = true;
      group.inZone = true;
      mover.classList.add('stopped');
    },
    // When the level ends, every branch stops growing.
    freeze() {
      layer.frozen = true;
    },
    // Eating: a wall forms across the thread right where the tip is (one
    // more cell). When she eats, a branch also
    // sprouts from the same spot, about 45 degrees off the way she was going,
    // on alternating sides. Returns the new branch, or null for a branch,
    // which only gets the wall (so the pace stays close to the yeasts').
    divide() {
      group.walls.push([...group.tip, group.angle]);
      if (!isPlayer) return null;
      group.side = -group.side;
      const copy = svg.cloneNode(false);
      return hyphaGroup({
        mover: newMover(copy),
        svg: copy,
        species,
        isPlayer: false,
        start: [...group.tip],
        angle: group.angle + group.side * GAME.BRANCH_ANGLE,
      });
    },
  });

  [group.x, group.y] = [start[0] * dishRadius(), start[1] * dishRadius()];
  return group;
}

// A number from 0 to 1 that's always the same for the same i and k, so the
// threads' wiggles and hairs stay put from frame to frame.
const noise = (i, k) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// How far each point is along its thread, in fractions of the dish radius.
function distances(line) {
  const s = [0];
  for (let i = 1; i < line.length; i++) {
    s.push(s[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  }
  return s;
}

// Which way is sideways from the thread at point i.
function sideways(line, i) {
  const a = line[Math.max(0, i - 1)];
  const b = line[Math.min(line.length - 1, i + 1)];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
}

// Real hyphae aren't ruler-straight, so the thread is drawn with a gentle
// wave. The wave goes by how far along the thread a point is, so the old
// part holds still as she grows, and it fades out at both ends so the
// thread still meets its tip and the thread it branched from.
function wavy(line, seed) {
  const s = distances(line);
  const total = s.at(-1);
  const ease = GAME.HYPHA_WAVELENGTH / 3;
  return line.map((p, i) => {
    const fade = Math.min(1, s[i] / ease, (total - s[i]) / ease);
    const k = (2 * Math.PI) / GAME.HYPHA_WAVELENGTH;
    const wave = (Math.sin(s[i] * k + seed * 2.1) + 0.35 * Math.sin(s[i] * k * 1.7 + seed * 5.3)) / 1.35;
    const [nx, ny] = sideways(line, i);
    const off = GAME.HYPHA_WAVE * fade * wave;
    return [p[0] + nx * off, p[1] + ny * off];
  });
}

// Fine hairs along a thread, each [from, to], sticking out a little from
// either side at uneven spots, so the thread looks fuzzy.
function hairs(line, seed) {
  const out = [];
  const s = distances(line);
  const total = s.at(-1);
  line.forEach((p, i) => {
    if (total - s[i] < GAME.HYPHA_WIDTH * 2) return; // none right at the growing tip
    for (const side of [1, -1]) {
      const k = seed * 1000 + i * 2 + (side > 0 ? 0 : 1);
      if (noise(k, 1) > 0.55) continue;
      const [nx, ny] = sideways(line, i);
      const tilt = (noise(k, 2) - 0.5) * 1.4; // not all straight out
      const [dx, dy] = [nx * Math.cos(tilt) - ny * Math.sin(tilt), nx * Math.sin(tilt) + ny * Math.cos(tilt)];
      const start = GAME.HYPHA_WIDTH * 0.45 * side;
      const end = start + GAME.HYPHA_WIDTH * (0.5 + noise(k, 3)) * side;
      out.push([[p[0] + dx * start, p[1] + dy * start], [p[0] + dx * end, p[1] + dy * end]]);
    }
  });
  return out;
}

// One canvas per dish that draws every thread: a soft fuzzy haze with fine
// hairs, a dark tube with a light core, and a bold bar across it for each
// wall.
const layers = new WeakMap();
export function threadLayer(agar, colors) {
  if (layers.has(agar)) return layers.get(agar);
  const canvas = document.createElement('canvas');
  canvas.className = 'mycelium';
  canvas.setAttribute('aria-hidden', 'true');
  agar.prepend(canvas);
  const groups = [];
  const layer = {
    canvas,
    frozen: false,
    add: (group) => groups.push(group),
    draw() {
      let ctx = null;
      try {
        ctx = canvas.getContext('2d');
      } catch {
        // No canvas (an old browser or a test page): the tips still show.
      }
      if (!ctx) return;
      const size = agar.clientWidth;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(size * dpr)) {
        canvas.width = Math.round(size * dpr);
        canvas.height = Math.round(size * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const r = size / 2;
      const at = ([x, y]) => [r + x * r, r + y * r];
      const width = GAME.HYPHA_WIDTH * r;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const raw = groups.map((g) => [...g.path, g.tip]);
      const lines = raw.map((line, i) => wavy(line, i));
      // A smooth curve through the points instead of straight bits.
      const trace = (line) => {
        ctx.beginPath();
        ctx.moveTo(...at(line[0]));
        for (let i = 1; i < line.length - 1; i++) {
          const mid = [(line[i][0] + line[i + 1][0]) / 2, (line[i][1] + line[i + 1][1]) / 2];
          ctx.quadraticCurveTo(...at(line[i]), ...at(mid));
        }
        ctx.lineTo(...at(line.at(-1)));
      };
      // Fuzz: a soft haze around each thread, and fine hairs sticking out.
      ctx.strokeStyle = colors.stroke;
      lines.forEach((line, i) => {
        trace(line);
        ctx.globalAlpha = 0.12;
        ctx.lineWidth = width * 3;
        ctx.stroke();
        ctx.beginPath();
        hairs(line, i).forEach(([from, to]) => {
          ctx.moveTo(...at(from));
          ctx.lineTo(...at(to));
        });
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = Math.max(0.6, width * 0.2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      for (const line of lines) {
        trace(line);
        ctx.lineWidth = width;
        ctx.stroke();
      }
      groups.forEach((g, i) => {
        trace(lines[i]);
        ctx.strokeStyle = g.inZone ? '#e5e7eb' : colors.fill;
        ctx.lineWidth = width * 0.55;
        ctx.stroke();
      });
      // Each wall: a bold bar straight across the thread, where the wavy
      // thread passes the spot she ate.
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = Math.max(1.5, width * 0.45);
      ctx.lineCap = 'butt';
      groups.forEach((g, i) => {
        for (const [wx, wy, angle] of g.walls) {
          const near = raw[i].reduce((best, p, j) =>
            Math.hypot(p[0] - wx, p[1] - wy) < Math.hypot(raw[i][best][0] - wx, raw[i][best][1] - wy) ? j : best, 0);
          const [x, y] = lines[i][near];
          const reach = GAME.HYPHA_WIDTH * 1.3; // sticks out past the thin thread, so it shows
          const [nx, ny] = [-Math.sin(angle) * reach, Math.cos(angle) * reach];
          ctx.beginPath();
          ctx.moveTo(...at([x + nx, y + ny]));
          ctx.lineTo(...at([x - nx, y - ny]));
          ctx.stroke();
        }
      });
    },
  };
  layers.set(agar, layer);
  return layer;
}

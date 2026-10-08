import { GAME } from './config.js';
import { newMover } from './mover.js';

// A mold (Fumi) grows as threads called hyphae instead of budding. The player
// is a growing hyphal tip: she always grows forward, and steering turns her.
// Walls (septa) form along her thread every GAME.SEPTUM of the dish radius,
// and each walled compartment counts as one cell. Eating sprouts a branch
// about 45 degrees off her line; each branch is an offspring group that grows
// a short way on its own, eats, and branches again. A branch that grows into
// an antifungal zone stops there (see stopInZone); the thread behind it stays.
//
// The threads are drawn on one canvas under everything else on the agar
// (see threadLayer); each group's mover only shows its tip.
export function hyphaGroup({ mover, svg, species, isPlayer, start = [0, 0], angle = -Math.PI / 2 }) {
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
    want: null, // which way the player wants to turn, or null
    // The thread, as fixed points in fractions of the dish radius; the tip
    // itself is always the live end.
    path: [start],
    tip: [...start],
    length: 0, // how long the thread is, in fractions of the dish radius
    // A branch grows this much farther (more when it eats); the player never
    // runs out.
    budget: isPlayer ? Infinity : GAME.BRANCH_LENGTH,
    stopped: false, // grew into a zone, ran into the rim, or the level ended
    side: 1, // which side the next branch sprouts on
    cellCount: () => 1 + Math.floor(group.length / GAME.SEPTUM),
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
  mover.style.width = `${(isPlayer ? GAME.TIP_SIZE : GAME.HYPHA_WIDTH) * 50}%`;

  function grow(seconds) {
    if (group.want !== null) {
      const turn = Math.atan2(Math.sin(group.want - group.angle), Math.cos(group.want - group.angle));
      const most = GAME.HYPHA_TURN * seconds;
      group.angle += Math.max(-most, Math.min(most, turn));
    }
    const speed = isPlayer ? GAME.HYPHA_SPEED : GAME.BRANCH_SPEED;
    const step = Math.min(speed * seconds, group.budget);
    let nx = group.tip[0] + Math.cos(group.angle) * step;
    let ny = group.tip[1] + Math.sin(group.angle) * step;
    const fromCenter = Math.hypot(nx, ny);
    if (fromCenter > GAME.HYPHA_RIM) {
      // A branch stops at the rim; the player slides along it instead.
      if (!isPlayer) {
        group.stopped = true;
        return;
      }
      const out = Math.atan2(ny, nx);
      const along = out + (Math.sin(group.angle - out) >= 0 ? Math.PI / 2 : -Math.PI / 2);
      group.angle = along;
      nx = (nx / fromCenter) * GAME.HYPHA_RIM;
      ny = (ny / fromCenter) * GAME.HYPHA_RIM;
    }
    const moved = Math.hypot(nx - group.tip[0], ny - group.tip[1]);
    group.tip = [nx, ny];
    group.length += moved;
    group.budget -= moved;
    const [lx, ly] = group.path.at(-1);
    if (Math.hypot(nx - lx, ny - ly) > GAME.HYPHA_POINT) group.path.push([nx, ny]);
  }

  Object.assign(group, {
    reach: () => 0, // nothing pushes against a thread
    // Steer toward this direction: arrow keys [dx, dy], a mouse held on the
    // dish (a spot in px from the dish center), or a finger dragging that
    // way ([dx, dy] in px). With none of them, she keeps growing straight.
    steer([dx, dy], finger, dragged = [0, 0]) {
      if (dx !== 0 || dy !== 0) group.want = Math.atan2(dy, dx);
      else if (dragged[0] !== 0 || dragged[1] !== 0) group.want = Math.atan2(dragged[1], dragged[0]);
      else if (finger) group.want = Math.atan2(finger[1] - group.y, finger[0] - group.x);
      else group.want = null;
    },
    update(seconds) {
      if (!group.stopped && !layer.frozen && group.budget > 0 && seconds > 0) grow(seconds);
      // Positions are kept as fractions of the dish, so they follow a resize.
      const radius = dishRadius();
      [group.x, group.y] = [group.tip[0] * radius, group.tip[1] * radius];
      if (isPlayer) layer.draw();
    },
    place() {
      mover.style.transform = `translate(${group.x}px, ${group.y}px)`;
    },
    // The tip, which is what eats, and what touches a zone. A branch that
    // stopped in a zone has nothing left to touch.
    body() {
      if (group.stopped && group.inZone) return [];
      const r = ((isPlayer ? GAME.TIP_SIZE : GAME.HYPHA_WIDTH) / 2) * dishRadius();
      return [[group.x, group.y, r]];
    },
    // A branch that grows into a zone stops right there, and its tip grays.
    stopInZone() {
      group.stopped = true;
      group.inZone = true;
      mover.classList.add('stopped');
    },
    // When the level ends, every thread stops growing.
    freeze() {
      layer.frozen = true;
    },
    // Eating sprouts a branch a little behind the tip, about 45 degrees off
    // its line, on alternating sides. A branch that eats also gets to grow
    // farther. Returns the new branch.
    divide() {
      if (!isPlayer) group.budget = Math.max(group.budget, 0) + GAME.BRANCH_LENGTH / 2;
      const from = group.path[Math.max(0, group.path.length - 3)];
      group.side = -group.side;
      const copy = svg.cloneNode(false);
      return hyphaGroup({
        mover: newMover(copy),
        svg: copy,
        species,
        isPlayer: false,
        start: [...from],
        angle: group.angle + group.side * GAME.BRANCH_ANGLE,
      });
    },
  });

  if (isPlayer) svg.style.animation = 'none'; // her tip stays on the end of her thread
  group.update(0);
  return group;
}

// One canvas per dish that draws every thread: a dark tube with a light
// core, and a wall across it every GAME.SEPTUM.
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
      const lines = groups.map((g) => [...g.path, g.tip]);
      const trace = (line) => {
        ctx.beginPath();
        line.forEach((p, i) => (i ? ctx.lineTo(...at(p)) : ctx.moveTo(...at(p))));
      };
      for (const line of lines) {
        trace(line);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = width;
        ctx.stroke();
      }
      groups.forEach((g, i) => {
        trace(lines[i]);
        ctx.strokeStyle = g.inZone ? '#e5e7eb' : colors.fill;
        ctx.lineWidth = width * 0.5;
        ctx.stroke();
      });
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = Math.max(1, width * 0.18);
      for (const line of lines) {
        for (const [x, y, nx, ny] of septa(line)) {
          const w = GAME.HYPHA_WIDTH * 0.45;
          ctx.beginPath();
          ctx.moveTo(...at([x + nx * w, y + ny * w]));
          ctx.lineTo(...at([x - nx * w, y - ny * w]));
          ctx.stroke();
        }
      }
    },
  };
  layers.set(agar, layer);
  return layer;
}

// Where the walls go along a thread (points in fractions of the dish radius):
// one every GAME.SEPTUM from its start, each as [x, y, nx, ny], the spot and
// the direction across the thread.
export function septa(line) {
  const walls = [];
  let along = 0;
  let next = GAME.SEPTUM;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1];
    const [bx, by] = line[i];
    const length = Math.hypot(bx - ax, by - ay);
    if (length === 0) continue;
    while (along + length >= next) {
      const t = (next - along) / length;
      walls.push([ax + (bx - ax) * t, ay + (by - ay) * t, -(by - ay) / length, (bx - ax) / length]);
      next += GAME.SEPTUM;
    }
    along += length;
  }
  return walls;
}

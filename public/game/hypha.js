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
        if (radius > 0) extend([group.x / radius, group.y / radius]);
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
    // more cell, with a "+1" to show it). When she eats, a branch also
    // sprouts from the same spot, about 45 degrees off the way she was going,
    // on alternating sides. Returns the new branch, or null for a branch,
    // which only gets the wall (so the pace stays close to the yeasts').
    divide() {
      group.walls.push([...group.tip, group.angle]);
      showPlusOne(mover.parentElement, group.tip);
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

// A "+1" that floats up from a new wall and fades (see .cell-plus in
// styles.css). `at` is in fractions of the dish radius.
export function showPlusOne(agar, [x, y]) {
  if (!agar) return;
  const plus = document.createElement('span');
  plus.className = 'cell-plus';
  plus.textContent = '+1';
  plus.setAttribute('aria-hidden', 'true');
  plus.style.left = `${50 + x * 50}%`;
  plus.style.top = `${50 + y * 50}%`;
  agar.append(plus);
  const remove = () => plus.remove();
  plus.addEventListener('animationend', remove);
  setTimeout(remove, 1500); // in case the animation never runs
}

// One canvas per dish that draws every thread: a dark tube with a light
// core, and a bold bar across it for each wall.
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
        ctx.lineWidth = width * 0.55;
        ctx.stroke();
      });
      // Each wall: a bold bar straight across the thread.
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = Math.max(1.5, width * 0.45);
      ctx.lineCap = 'butt';
      for (const g of groups) {
        for (const [x, y, angle] of g.walls) {
          const reach = GAME.HYPHA_WIDTH * 1.3; // sticks out past the thin thread, so it shows
          const [nx, ny] = [-Math.sin(angle) * reach, Math.cos(angle) * reach];
          ctx.beginPath();
          ctx.moveTo(...at([x + nx, y + ny]));
          ctx.lineTo(...at([x - nx, y - ny]));
          ctx.stroke();
        }
      }
    },
  };
  layers.set(agar, layer);
  return layer;
}

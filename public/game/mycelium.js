// Draws a mold's threads (see mold.js) on one canvas under everything else
// on the agar: a soft fuzzy haze with fine hairs, a dark tube with a light
// core, and a wall across the thread at every cell. A dead tip's thread is
// grayed. Her face rides her lead tip separately, as a page element (see
// mold-game.js).
import { GAME } from './config.js';

// A number from 0 to 1 that's always the same for the same i and k, so the
// threads' wiggles and hairs stay put from frame to frame.
const noise = (i, k) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// How far each point is along its thread.
export function distances(line) {
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

// Real hyphae aren't ruler-straight, so a thread is drawn with a gentle
// wave. The wave goes by how far along the thread a point is, so the old
// part holds still as she grows, and it fades out at both ends so the thread
// still meets its tip and the thread it branched from.
export function wavy(line, seed) {
  const { WAVE, WAVELENGTH } = GAME.MOLD;
  const s = distances(line);
  const total = s.at(-1);
  const ease = WAVELENGTH / 3;
  const k = (2 * Math.PI) / WAVELENGTH;
  return line.map((p, i) => {
    const fade = Math.min(1, s[i] / ease, (total - s[i]) / ease);
    const wave = (Math.sin(s[i] * k + seed * 2.1) + 0.35 * Math.sin(s[i] * k * 1.7 + seed * 5.3)) / 1.35;
    const [nx, ny] = sideways(line, i);
    const off = WAVE * fade * wave;
    return [p[0] + nx * off, p[1] + ny * off];
  });
}

// Fine hairs along a thread, each [from, to], sticking out a little from
// either side at uneven spots, so the thread looks fuzzy.
export function hairs(line, seed) {
  const { WIDTH } = GAME.MOLD;
  const out = [];
  const s = distances(line);
  const total = s.at(-1);
  line.forEach((p, i) => {
    if (total - s[i] < WIDTH * 2) return; // none right at the growing tip
    for (const side of [1, -1]) {
      const k = seed * 1000 + i * 2 + (side > 0 ? 0 : 1);
      if (noise(k, 1) > 0.55) continue;
      const [nx, ny] = sideways(line, i);
      const tilt = (noise(k, 2) - 0.5) * 1.4; // not all straight out
      const [dx, dy] = [nx * Math.cos(tilt) - ny * Math.sin(tilt), nx * Math.sin(tilt) + ny * Math.cos(tilt)];
      const start = WIDTH * 0.45 * side;
      const end = start + WIDTH * (0.5 + noise(k, 3)) * side;
      out.push([[p[0] + dx * start, p[1] + dy * start], [p[0] + dx * end, p[1] + dy * end]]);
    }
  });
  return out;
}

// Where the walls go on a drawn thread: one every MOLD.CELL_LENGTH of the
// thread's real length (`length`), each [x, y, angle], placed on the wavy
// line (`drawn`, with `s` how far along the real path each point is).
export function walls(drawn, s, length) {
  const { CELL_LENGTH } = GAME.MOLD;
  const out = [];
  let i = 1;
  for (let at = CELL_LENGTH; at <= length + 1e-9; at += CELL_LENGTH) {
    while (i < drawn.length - 1 && s[i] < at) i++;
    const [a, b] = [drawn[i - 1], drawn[i]];
    const span = s[i] - s[i - 1] || 1;
    const t = Math.min(1, Math.max(0, (at - s[i - 1]) / span));
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])]);
  }
  return out;
}

// Make the canvas for the threads, underneath everything else on the agar.
export function myceliumCanvas(agar) {
  const canvas = document.createElement('canvas');
  canvas.className = 'mycelium';
  canvas.setAttribute('aria-hidden', 'true');
  agar.prepend(canvas);
  return canvas;
}

// Draw all of `mold`'s threads on `canvas`, sized to the agar.
export function drawMycelium(canvas, agar, mold, colors) {
  let ctx = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    // No canvas (an old browser or a test page): nothing to draw on.
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
  const width = GAME.MOLD.WIDTH * r;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const raw = mold.threads.map((t) => [...t.path, t.tip]);
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
    for (const [from, to] of hairs(line, i)) {
      ctx.moveTo(...at(from));
      ctx.lineTo(...at(to));
    }
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = Math.max(0.6, width * 0.2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  // The tube, then its light core (gray where the tip died).
  for (const line of lines) {
    trace(line);
    ctx.lineWidth = width;
    ctx.stroke();
  }
  mold.threads.forEach((thread, i) => {
    trace(lines[i]);
    ctx.strokeStyle = thread.alive ? colors.fill : '#e5e7eb';
    ctx.lineWidth = width * 0.55;
    ctx.stroke();
  });

  // A wall across the thread at every cell.
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = Math.max(1.5, width * 0.45);
  ctx.lineCap = 'butt';
  ctx.beginPath();
  mold.threads.forEach((thread, i) => {
    for (const [x, y, angle] of walls(lines[i], distances(raw[i]), thread.length)) {
      const reach = GAME.MOLD.WIDTH * 1.3; // sticks out past the thin thread, so it shows
      const [nx, ny] = [-Math.sin(angle) * reach, Math.cos(angle) * reach];
      ctx.moveTo(...at([x + nx, y + ny]));
      ctx.lineTo(...at([x - nx, y - ny]));
    }
  });
  ctx.stroke();

  // A dead tip: a gray dot where it stopped.
  ctx.fillStyle = '#9ca3af';
  for (const thread of mold.threads) {
    if (thread.alive) continue;
    ctx.beginPath();
    ctx.arc(...at(thread.tip), width * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

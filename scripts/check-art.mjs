// The art check: draws every gal in a real browser (Chromium, through
// Playwright) and looks for the art problems that are easy to miss by eye:
//
// - Spills: art reaching past one of her frames (home, picker or dish),
//   where it gets cut off. Some art runs off the edge on purpose, like
//   Opal's tree trunk or a thread along the agar: mark it class="bleed" in
//   gals.js and it's left out. Bea's tail (class="tail") is left out too,
//   since styles.css lets it show past her frame.
// - Crowded faces: a detail, like a droplet, spore or the edge of her
//   body, coming within FACE_GAP of her eyes or smile, or crossing one of
//   her cheeks. Lines hidden behind something drawn on top don't count.
//
// It also saves a contact sheet of every gal's picker card, in picker order
// with her name in her color, to art-check/contact-sheet.png, with a red
// outline on any card that has a problem.
//
//   npm run check:art
//
// It exits with an error when it finds a problem, after listing them all.
// The first time, install the browser: npx playwright install chromium
import { createReadStream, mkdirSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { frameBox, worstSpill } from './art-geometry.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const OUT = join(ROOT, 'art-check');
const GEOMETRY = join(ROOT, 'scripts', 'art-geometry.js');
// Art can spill this far (drawing units) before it counts: a sliver of a
// round outline's edge doesn't show.
const SPILL_OK = 1;
// How close (drawing units) a detail can come to her eyes or smile.
const FACE_GAP = 1;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

// The page the browser opens. window.measure() draws every gal in each of
// her three frames and measures her; window.zoom() and window.sheet() draw
// the pictures.
const HARNESS = `<!doctype html>
<meta charset="utf-8">
<link rel="stylesheet" href="./styles.css">
<style>
  body { margin: 0; padding: 16px; background: #f1ebfb; }
  #sheet { display: grid; grid-template-columns: repeat(6, 150px); gap: 14px; padding: 8px; }
  .card { text-align: center; font: 600 13px/1.2 system-ui, sans-serif; }
  .card .gal-icon { width: 150px; height: 150px; }
  .card .gal-icon svg { width: 100%; height: 100%; }
  .card.bad .gal-icon { outline: 4px solid #dc2626; outline-offset: 2px; }
  .card i { display: block; font-weight: 400; color: #475569; }
  #work svg, #work .gal-icon { width: 400px; height: 400px; display: block; }
</style>
<div id="sheet"></div>
<div id="work"></div>
<script type="module">
  import { byScientificName, dishGal, galTile, homeGal } from './game/gals.js';
  import { SPECIES } from './game/config.js';
  import * as geometry from './__art-geometry.js';
  const SHAPES = 'circle, ellipse, path, rect, line, polyline, polygon';
  const CHEEK = '#f9a8d4'; // every gal's rosy cheeks (face() in gals.js)

  // A shape's outline as points in her drawing units, and half its stroke.
  function outline(el, toRoot) {
    const style = getComputedStyle(el);
    const scale = Math.hypot(toRoot.a, toRoot.b);
    const half = style.stroke === 'none' ? 0 : (parseFloat(style.strokeWidth) * scale) / 2;
    const length = el.getTotalLength();
    const steps = Math.max(24, Math.ceil(length / 2));
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const { x, y } = el.getPointAtLength((length * i) / steps).matrixTransform(toRoot);
      points.push({ x, y });
    }
    return { points, half };
  }

  // What a shape is, for the report: the nearest comment before it, or
  // before the group it's in (the art is commented), else its tag.
  function label(el) {
    for (let at = el; at && at.tagName !== 'svg'; at = at.parentNode) {
      for (let node = at.previousSibling; node; node = node.previousSibling) {
        if (node.nodeType === Node.COMMENT_NODE) return node.textContent.trim().replace(/\\s+/g, ' ');
      }
    }
    return '<' + el.tagName + '>';
  }

  // Whether point p on shape s is covered by a shape drawn after it (and
  // not part of her face), like a stalk running behind her head.
  function hidden(p, s, shapes, face) {
    return shapes.slice(shapes.indexOf(s) + 1).some((t) => !face.contains(t.el)
      && getComputedStyle(t.el).fill !== 'none'
      && t.el.isPointInFill(new DOMPoint(p.x, p.y).matrixTransform(t.toRoot.inverse())));
  }

  window.measure = (gap) => {
    const work = document.getElementById('work');
    const results = [];
    for (const gal of byScientificName()) {
      for (const [frame, draw] of [['home', homeGal], ['picker', galTile], ['dish', dishGal]]) {
        const made = draw(gal);
        const svg = made.tagName === 'svg' ? made : made.querySelector('svg');
        svg.removeAttribute('hidden');
        work.replaceChildren(made);
        const rootInverse = svg.getScreenCTM().inverse();
        const shapes = [...svg.querySelectorAll(SHAPES)]
          .filter((el) => !el.closest('defs, clipPath, mask'))
          .map((el) => {
            const toRoot = rootInverse.multiply(el.getScreenCTM());
            return { el, toRoot, cheek: el.getAttribute('fill') === CHEEK, ...outline(el, toRoot) };
          });
        const face = svg.querySelector('.face');
        const faceShapes = shapes.filter((s) => face?.contains(s.el));
        const faceBox = geometry.union(faceShapes.map((s) => geometry.around(s.points, s.half)));
        const spills = shapes.filter((s) => !s.el.closest('.tail, .bleed'))
          .map((s) => ({ label: label(s.el), box: geometry.around(s.points, s.half) }));
        const crowding = [];
        for (const s of shapes) {
          if (face?.contains(s.el)) continue;
          // Rosy cheeks can sit right up against an outline, the way most
          // gals' do; they only count when they cross it.
          const points = faceShapes.flatMap((f) => geometry.crowding(s, f, f.cheek ? -f.half - s.half : gap))
            .filter((p) => !hidden(p, s, shapes, face));
          if (points.length) crowding.push({ label: label(s.el), points });
        }
        results.push({ id: gal.id, frame, viewBox: svg.getAttribute('viewBox'), spills, faceBox, crowding });
      }
    }
    work.replaceChildren();
    return results;
  };

  // The contact sheet: every picker card, in picker order.
  // A close-up of one crowded face: her face's box in blue, and the parts
  // of the shape that come too close in red.
  window.zoom = (id, frame, faceBox, points) => {
    const gal = byScientificName().find((g) => g.id === id);
    const made = { home: homeGal, picker: galTile, dish: dishGal }[frame](gal);
    const svg = made.tagName === 'svg' ? made : made.querySelector('svg');
    svg.removeAttribute('hidden');
    const ns = 'http://www.w3.org/2000/svg';
    const mark = (tag, attrs) => {
      const el = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      svg.append(el);
    };
    mark('rect', { x: faceBox.x0, y: faceBox.y0, width: faceBox.x1 - faceBox.x0, height: faceBox.y1 - faceBox.y0,
      fill: 'none', stroke: '#2563eb', 'stroke-width': 1, 'stroke-dasharray': '3 2' });
    for (const p of points) mark('circle', { cx: p.x, cy: p.y, r: 1.4, fill: '#dc2626' });
    const work = document.getElementById('work');
    work.replaceChildren(made);
    made.style.background = '#fff';
  };

  window.sheet = (bad) => {
    const sheet = document.getElementById('sheet');
    for (const gal of byScientificName()) {
      const card = document.createElement('div');
      card.className = 'card' + (bad.includes(gal.id) ? ' bad' : '');
      const name = document.createElement('div');
      name.textContent = gal.name;
      name.style.color = SPECIES[gal.id].color;
      const sci = document.createElement('i');
      sci.textContent = SPECIES[gal.id].scientific;
      card.append(galTile(gal), name, sci);
      sheet.append(card);
    }
  };
  window.ready = true;
</script>`;

// A tiny static server for public/, plus the harness page.
function serve() {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/__art-check.html') {
      res.writeHead(200, { 'content-type': 'text/html' }).end(HARNESS);
      return;
    }
    // The geometry helpers, shared with this script.
    const file = path === '/__art-geometry.js' ? GEOMETRY : normalize(join(PUBLIC, path));
    try {
      if (!(file === GEOMETRY || file.startsWith(PUBLIC)) || !statSync(file).isFile()) throw new Error('not found');
    } catch {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

const fmt = (n) => n.toFixed(1);

const server = await serve();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/__art-check.html`);
  await page.waitForFunction(() => window.ready === true);
  if (errors.length) throw new Error(errors.join('\n'));

  const results = await page.evaluate((gap) => window.measure(gap), FACE_GAP);

  const problems = [];
  for (const r of results) {
    const frame = frameBox(r.viewBox);
    // One line per commented part of her art, for its worst spill.
    const worst = new Map();
    for (const s of r.spills) {
      const w = worstSpill(s.box, frame);
      if (w && w.by > SPILL_OK && !(worst.get(s.label)?.by >= w.by)) worst.set(s.label, w);
    }
    for (const [label, w] of worst) {
      problems.push({ id: r.id, text: `${r.frame} frame: "${label}" spills ${fmt(w.by)} past the ${w.side} edge` });
    }
    for (const c of new Map(r.crowding.map((c) => [c.label, c])).values()) {
      problems.push({ id: r.id, text: `${r.frame} frame: "${c.label}" crowds her face`, frame: r.frame, faceBox: r.faceBox, points: c.points });
    }
  }
  // The same problem in several frames reads once per frame; that's fine,
  // since a frame can be fixed on its own.
  const bad = [...new Set(problems.map((p) => p.id))];

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  let n = 0;
  for (const p of problems.filter((q) => q.points)) {
    await page.evaluate((q) => window.zoom(q.id, q.frame, q.faceBox, q.points), p);
    p.picture = join('art-check', `${p.id}-${p.frame}-${++n}.png`);
    await page.locator('#work').screenshot({ path: join(ROOT, p.picture) });
  }
  await page.evaluate(() => document.getElementById('work').replaceChildren());

  await page.evaluate((ids) => window.sheet(ids), bad);
  await page.locator('#sheet').screenshot({ path: join(OUT, 'contact-sheet.png') });

  const gals = new Set(results.map((r) => r.id)).size;
  if (problems.length) {
    console.log(`Art check: ${problems.length} problem(s) in ${bad.length} of ${gals} gals.\n`);
    for (const p of problems) console.log(`  ${p.id}: ${p.text}${p.picture ? ` (see ${p.picture})` : ''}`);
  } else {
    console.log(`Art check: all ${gals} gals fit their frames, with room around their faces.`);
  }
  console.log(`\nContact sheet: ${join('art-check', 'contact-sheet.png')}`);
  process.exitCode = problems.length ? 1 : 0;
} finally {
  await browser.close();
  server.close();
}

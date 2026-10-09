// Fumi (Aspergillus fumigatus): guide her spore to nutrients to start colonies.
// Colonies count immediately, spread in circles, and turn green as they sporulate.
// Start enough to win; disks/zones pop colonies and end the game on spore contact.
//
// Phyllis (Schizophyllum commune, `pairs` in her species) plays the same way,
// but a colony of hers can't make mushrooms on its own. Every spore she
// plants is a new mating type (a `strain`); a colony that spreads onto a
// nutrient starts a clone of itself, with the same strain. When two of her
// colonies of different strains grow into each other, they mate and a
// split-gill mushroom pops up where they meet. Mushrooms win her levels.
import { spreadZones, touchedDisk, touchesDisk, touchMessage } from './antifungal.js';
import { levelBanner } from './banner.js';
import { showPop } from './colony.js';
import { GAME, LEVELS } from './config.js';
import { showFact } from './facts.js';
import { arrowKeys } from './keyboard.js';
import { keepInDish } from './physics.js';
import { sporeBurst } from './spores.js';
import { steer, touchSteering } from './touch.js';
import { track } from './track.js';

// Phyllis's mushroom: a little fuzzy fan with split gills, seen from above.
const MUSHROOM = ({ fill, stroke, spores }) => `
  <svg viewBox="-12 -12 24 24">
    <path d="M0 5 C-8 4 -9 -6 -4 -8 Q0 -10 4 -8 C9 -6 8 4 0 5 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.4" />
    <g stroke="${spores}" stroke-width="0.9" stroke-linecap="round">
      <path d="M0 4 L-5 -5" /><path d="M0 4 L-2 -7" /><path d="M0 4 L2 -7" /><path d="M0 4 L5 -5" />
    </g>
  </svg>`;

// Colony radius after `seconds`, in dish radii; grows steadily to full size.
export function colonyRadius(seconds) {
  const t = Math.min(1, Math.max(0, seconds / GAME.COLONY_GROW_SECONDS));
  return GAME.COLONY_START + (GAME.COLONY_FULL - GAME.COLONY_START) * t;
}

// Colonies: `layer` draws them; `nutrients` seed new ones, even underneath.
// `colors` are the gal's palette; `spores` colors their centers.
// With `pairs` (Phyllis), colonies of different strains that touch mate and
// make mushrooms (see the top of this file).
// Positions and sizes use fractions of the dish radius.
export function moldColonies({ layer, disks = [], nutrients, colors, pairs = false }) {
  const colonies = [];
  const mushrooms = [];
  let strains = 0;

  function draw(colony) {
    const { el, fx, fy, r } = colony;
    el.style.left = `${50 + fx * 50}%`;
    el.style.top = `${50 + fy * 50}%`;
    el.style.width = `${r * 100}%`;
    // The colored middle: for Fumi, her greenish, sporing middle spreads out
    // a little as she grows; Phyllis stays white until she's mated, then
    // blushes. The rest stays white and fluffy.
    const ripe = pairs ? Number(colony.mated) : Math.min(1, colony.age / GAME.COLONY_GROW_SECONDS);
    el.style.setProperty('--ripe', `${Math.round(ripe * 40)}%`);
  }

  function remove(colony) {
    colonies.splice(colonies.indexOf(colony), 1);
    // Her mushrooms need both their colonies.
    for (const mushroom of mushrooms.filter((m) => m.colonies.includes(colony))) {
      mushrooms.splice(mushrooms.indexOf(mushroom), 1);
      mushroom.el.remove();
    }
  }

  // A mushroom pops up where colonies `a` and `b` meet, on the line between
  // their middles, facing out from it.
  function fruit(a, b) {
    const along = a.r / (a.r + b.r);
    const fx = a.fx + (b.fx - a.fx) * along;
    const fy = a.fy + (b.fy - a.fy) * along;
    const el = document.createElement('div');
    el.className = 'mushroom';
    el.setAttribute('aria-hidden', 'true');
    el.style.left = `${50 + fx * 50}%`;
    el.style.top = `${50 + fy * 50}%`;
    const angle = (Math.atan2(b.fy - a.fy, b.fx - a.fx) * 180) / Math.PI + 90;
    el.style.setProperty('--turn', `${Math.round(angle)}deg`);
    el.innerHTML = MUSHROOM(colors);
    layer.appendChild(el);
    mushrooms.push({ colonies: [a, b], fx, fy, el });
    for (const colony of [a, b]) {
      colony.mated = true;
      draw(colony);
    }
  }

  // Phyllis: any two colonies of different strains that touch, and haven't
  // already made a mushroom together, make one now.
  function mate() {
    for (let i = 0; i < colonies.length; i++) {
      for (let j = i + 1; j < colonies.length; j++) {
        const [a, b] = [colonies[i], colonies[j]];
        if (a.strain === b.strain) continue;
        if (Math.hypot(a.fx - b.fx, a.fy - b.fy) > a.r + b.r) continue;
        if (mushrooms.some((m) => m.colonies.includes(a) && m.colonies.includes(b))) continue;
        fruit(a, b);
      }
    }
  }

  const api = {
    colonies,
    mushrooms,
    // How many colonies there are: each counts as soon as it starts.
    count: () => colonies.length,

    // A spore germinates at (fx, fy) and starts a colony, even on top of
    // another one. A new spore is a new strain; a colony spreading onto a
    // nutrient passes on its own `strain`. Returns the new colony.
    plant(fx, fy, strain = ++strains) {
      const el = document.createElement('div');
      el.className = 'colony';
      el.setAttribute('aria-hidden', 'true');
      el.style.setProperty('--spores', colors.spores);
      // A slightly uneven edge, different for each colony.
      const wobble = () => `${47 + Math.random() * 6}%`;
      el.style.borderRadius =
        `${wobble()} ${wobble()} ${wobble()} ${wobble()} / ${wobble()} ${wobble()} ${wobble()} ${wobble()}`;
      const colony = { fx, fy, r: colonyRadius(0), age: 0, el, strain, mated: false };
      draw(colony);
      layer.appendChild(el);
      colonies.push(colony);
      return colony;
    },

    // Spread every colony for `seconds`. A full-size colony stays that size.
    // A nutrient fleck a colony reaches isn't wasted: it starts a new colony
    // centered exactly where the fleck was.
    grow(seconds) {
      for (const colony of [...colonies]) {
        if (colony.age < GAME.COLONY_GROW_SECONDS) {
          colony.age += seconds;
          colony.r = colonyRadius(colony.age);
          draw(colony);
        }
        nutrients.eatNear(colony.fx, colony.fy, colony.r, (fx, fy) => api.plant(fx, fy, colony.strain));
      }
      if (pairs) mate();
    },

    // Any colony touching an antifungal disk or its zone dies: the whole
    // colony pops at once. `radius` is the dish radius in px, for the pop. Returns
    // how many died.
    killInZones(radius) {
      let died = 0;
      for (const colony of [...colonies]) {
        const circle = [colony.fx, colony.fy, colony.r];
        if (!disks.some((disk) => touchesDisk(disk, [circle], 1))) continue;
        remove(colony);
        died++;
        showPop(layer.parentElement, circle.map((v) => v * radius), colors.stroke);
        colony.el.classList.add('dying');
        const gone = () => colony.el.remove();
        colony.el.addEventListener('animationend', gone);
        setTimeout(gone, 1000); // in case the animation never runs
      }
      return died;
    },
  };
  return api;
}

// The player's spore: one little round cell, steered like any pal.
export function sporeGroup({ mover, agar }) {
  const spore = {
    mover,
    x: 0,
    y: 0,
    facing: 1,
    // Her circle, [x, y, r] in px from the dish center. The drawing's spikes
    // poke out a little past her round body, so she's a bit smaller than it.
    body: () => [[spore.x, spore.y, (mover.offsetWidth / 2) * 0.85]],
    // Keep her in the dish and move her drawing to where she is.
    place() {
      [spore.x, spore.y] = keepInDish(agar, spore.x, spore.y, mover.offsetWidth / 2);
      mover.style.transform = `translate(${spore.x}px, ${spore.y}px) scaleX(${spore.facing})`;
    },
  };
  return spore;
}

// "1 colony", "3 colonies"; "1 mushroom", "3 mushrooms".
const colonyCount = (n) => `${n} ${n === 1 ? 'colony' : 'colonies'}`;
const mushroomCount = (n) => `${n} ${n === 1 ? 'mushroom' : 'mushrooms'}`;

// The mold game loop: like the yeast game (game.js), but you plant colonies
// instead of budding, and `target` is how many colonies win the level (or,
// for Phyllis, how many mushrooms).
export function playMold(palEl, species, nutrients, disks, { level = 1, target = LEVELS[0].colonies } = {}) {
  const agar = document.querySelector('.agar');
  const counter = document.querySelector('.cell-count');
  const dishRadius = () => agar.clientWidth / 2;

  const playerMover = document.querySelector('.pal-mover');
  playerMover.classList.add('player', 'spore');
  const spore = sporeGroup({ mover: playerMover, agar });

  // The colonies grow on their own layer, under the spore and the disks,
  // clipped to the round dish so one by the rim doesn't spill over it.
  const layer = document.createElement('div');
  layer.className = 'colonies';
  agar.prepend(layer);
  const pairs = Boolean(species.pairs);
  const colonies = moldColonies({ layer, disks, nutrients, colors: species.colors, pairs });
  // What counts toward winning, and how to say it.
  const score = pairs ? () => colonies.mushrooms.length : colonies.count;
  const goal = pairs ? mushroomCount : colonyCount;

  let finished = false;
  let lastTime = null;
  let elapsed = 0; // for how far the zones have spread, as in game.js
  const keys = arrowKeys();
  const touch = touchSteering(agar, agar.closest('.petri-dish') ?? agar);
  const banner = levelBanner(level);

  function updateCounter() {
    const shown = Math.min(score(), target);
    counter.textContent = `Level ${level} · ${shown} / ${goal(target)}`;
  }

  function stop() {
    finished = true;
    keys.stop();
    touch.stop();
    nutrients.stop();
  }

  function step(time) {
    const seconds = lastTime === null ? 0 : Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;
    const radius = dishRadius();

    if (!finished) {
      elapsed += seconds;
      spreadZones(disks, elapsed);
      steer(spore, keys.direction(), touch.target(), GAME.SPORE_SPEED * radius * seconds,
        GAME.ARRIVE * radius, touch.drag(), GAME.DRAG_SPEED * radius * seconds);
      spore.place();

      const hit = touchedDisk(disks, spore.body(), radius);
      if (hit) {
        stop();
        playerMover.classList.add('killed');
        setTimeout(() => showGameOver(hit), 500);
      } else {
        // Landing on a nutrient: one of her spores germinates there, and the
        // colony grows out from exactly where the fleck was.
        const [[x, y, r]] = spore.body();
        nutrients.eatNear(x / radius, y / radius, r / radius, colonies.plant);
        colonies.killInZones(radius);
        if (score() >= target) {
          stop();
          sporeBurst(playerMover, { big: level === LEVELS.length });
          setTimeout(showWin, 400);
        }
      }
      updateCounter();
    }
    // Colonies keep spreading, even after the level ends.
    colonies.grow(seconds);

    requestAnimationFrame(step);
  }

  function showWin() {
    const name = palEl.dataset.name;
    const pal = palEl.dataset.pal;
    track(`level-complete/${pal}/level-${level}`, `${name} finished level ${level}`);
    if (level === LEVELS.length) track(`won-all-levels/${pal}`, `${name} beat every level`);
    showFact(pal, species);
    if (level < LEVELS.length) {
      banner.show(`Level ${level} complete!`, `You grew ${goal(target)}!`,
        `Play level ${level + 1}`, { next: level + 1 });
    } else {
      banner.show('You won!', `You beat all ${LEVELS.length} levels with ${goal(target)}!`,
        'Play again', { next: 1 });
    }
  }

  function showGameOver(disk) {
    showFact(palEl.dataset.pal, species);
    const { code, name } = disk.antifungal;
    track(`game-over/${palEl.dataset.pal}/level-${level}/${code}`,
      `${palEl.dataset.name} hit ${name} on level ${level}`);
    banner.show('Game over', touchMessage(palEl.dataset.name, disk), `Try level ${level} again`,
      { startOver: level > 1 });
  }

  spreadZones(disks, 0);
  for (const el of document.querySelectorAll('.target-colonies, .target-mushrooms')) el.textContent = target;
  updateCounter();
  requestAnimationFrame(step);
}

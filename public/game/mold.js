// Fumi (Aspergillus fumigatus): guide her spore to nutrients to start colonies.
// Colonies count immediately, spread in circles, and turn green as they sporulate.
// Start enough to win; disks/zones pop colonies and end the game on spore contact.
import { spreadZones, touchedDisk, touchesDisk, touchMessage } from './antifungal.js';
import { levelBanner } from './banner.js';
import { showPop } from './colony.js';
import { GAME, LEVELS } from './config.js';
import { showDrugFact, showFact } from './facts.js';
import { arrowKeys } from './keyboard.js';
import { keepInDish } from './physics.js';
import { sporeBurst } from './spores.js';
import { steer, touchSteering } from './touch.js';
import { track } from './track.js';

// Colony radius after `seconds`, in dish radii; grows steadily to full size.
export function colonyRadius(seconds) {
  const t = Math.min(1, Math.max(0, seconds / GAME.COLONY_GROW_SECONDS));
  return GAME.COLONY_START + (GAME.COLONY_FULL - GAME.COLONY_START) * t;
}

// Colonies: `layer` draws them; `nutrients` seed new ones, even underneath.
// `colors` are the gal's palette; `spores` colors their centers.
// With `drops` (Ruby), each colony beads with red drops, one at a time, as
// it ripens. With `wrinkled` (Rosie), each colony gets wrinkly folds as it
// darkens, and with `powdery` (Trixie) a soft white look with a tan middle (styles.css).
// With `pods` (Bea), each "colony" is a small, round spore pod that fills
// with spores and, once ripe, bursts: `onBurst(pod)` is called once, and her
// pods don't spread over nutrients. Positions and sizes use fractions of
// the dish radius.
export const DROPS = [
  // Where each drop sits on the colony (percent across and down), and how
  // ripe the colony is when it appears.
  { x: 50, y: 35, at: 0.4 },
  { x: 63, y: 59, at: 0.65 },
  { x: 37, y: 59, at: 0.9 },
];

// The spores filling one of Bea's pods, the same way: one by one as it ripens.
export const POD_SPORES = [
  { x: 50, y: 50, at: 0.15 },
  { x: 62, y: 44, at: 0.3 },
  { x: 40, y: 42, at: 0.45 },
  { x: 58, y: 62, at: 0.6 },
  { x: 38, y: 58, at: 0.75 },
  { x: 50, y: 33, at: 0.9 },
];

export function moldColonies({
  layer, disks = [], nutrients, colors, drops = false, wrinkled = false, powdery = false,
  pods = false, onBurst = () => {},
}) {
  const colonies = [];
  // A colony's radius after `seconds`: Bea's pods stay small.
  const size = (seconds) => colonyRadius(seconds) * (pods ? GAME.POD_SCALE : 1);

  function draw(colony) {
    const { el, fx, fy, r } = colony;
    el.style.left = `${50 + fx * 50}%`;
    el.style.top = `${50 + fy * 50}%`;
    el.style.width = `${r * 100}%`;
    // The greenish, sporing middle spreads out a little as it grows; the
    // rest stays white and fluffy.
    const ripe = Math.min(1, colony.age / GAME.COLONY_GROW_SECONDS);
    el.style.setProperty('--ripe', `${Math.round(ripe * 40)}%`);
    for (const bit of colony.bits) bit.el.classList.toggle('shown', ripe >= bit.at);
  }

  function remove(colony) {
    colonies.splice(colonies.indexOf(colony), 1);
  }

  const api = {
    colonies,
    // How many colonies there are: each counts as soon as it starts.
    count: () => colonies.length,

    // A spore germinates at (fx, fy) and starts a colony, even on top of
    // another one. Returns the new colony.
    plant(fx, fy) {
      const el = document.createElement('div');
      el.className = ['colony', wrinkled && 'wrinkled', powdery && 'powdery', pods && 'pod'].filter(Boolean).join(' ');
      el.setAttribute('aria-hidden', 'true');
      el.style.setProperty('--spores', colors.spores);
      // A slightly uneven edge, different for each colony.
      const wobble = () => `${47 + Math.random() * 6}%`;
      el.style.borderRadius =
        `${wobble()} ${wobble()} ${wobble()} ${wobble()} / ${wobble()} ${wobble()} ${wobble()} ${wobble()}`;
      const colony = { fx, fy, r: size(0), age: 0, el, bits: [] };
      // Ruby's drops or the spores in Bea's pods, at their own turn around
      // the middle for each colony.
      const bits = (drops && DROPS) || (pods && POD_SPORES) || [];
      const turn = Math.random() * Math.PI * 2;
      const [cos, sin] = [Math.cos(turn), Math.sin(turn)];
      for (const { x, y, at } of bits) {
        const bit = document.createElement('span');
        bit.className = drops ? 'drop' : 'pod-spore';
        bit.style.left = `${(50 + (x - 50) * cos - (y - 50) * sin).toFixed(1)}%`;
        bit.style.top = `${(50 + (x - 50) * sin + (y - 50) * cos).toFixed(1)}%`;
        if (drops) bit.style.background = colors.drop;
        el.appendChild(bit);
        colony.bits.push({ el: bit, at });
      }
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
          colony.r = size(colony.age);
          draw(colony);
        }
        if (!pods) {
          nutrients.eatNear(colony.fx, colony.fy, colony.r, api.plant);
        } else if (!colony.burst && colony.age >= GAME.COLONY_GROW_SECONDS) {
          // A ripe pod bursts once, leaving an empty shell.
          colony.burst = true;
          colony.el.classList.add('burst');
          onBurst(colony);
        }
      }
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

// Bea's little swimmers (zoospores), on the colonies' `layer`. `release`
// sends GAME.SWIMMERS of them out from a burst pod. Each paddles toward the
// nearest nutrient within GAME.SWIM_RANGE and settles on it, starting a new
// pod with `plant(fx, fy)`. One pops in a disk's zone, and one that finds
// nothing gives up after GAME.SWIM_SECONDS. Positions are in dish radii.
export function swimmerGroup({ layer, nutrients, disks = [], plant, colors }) {
  const swimmers = [];

  function draw(s) {
    s.el.style.left = `${50 + s.fx * 50}%`;
    s.el.style.top = `${50 + s.fy * 50}%`;
    s.el.style.rotate = `${Math.round((Math.atan2(s.dir[1], s.dir[0]) * 180) / Math.PI)}deg`;
  }

  function remove(s) {
    swimmers.splice(swimmers.indexOf(s), 1);
    s.el.remove();
  }

  return {
    swimmers,
    // Out of a pod at (fx, fy) of radius r, spread evenly around it.
    release(fx, fy, r) {
      const turn = Math.random() * Math.PI * 2;
      for (let i = 0; i < GAME.SWIMMERS; i++) {
        const a = turn + (i * Math.PI * 2) / GAME.SWIMMERS;
        const el = document.createElement('span');
        el.className = 'swimmer';
        el.setAttribute('aria-hidden', 'true');
        el.style.setProperty('--fill', colors.fill);
        el.style.setProperty('--edge', colors.stroke);
        const s = { el, fx: fx + Math.cos(a) * r, fy: fy + Math.sin(a) * r, dir: [Math.cos(a), Math.sin(a)], age: 0 };
        draw(s);
        layer.appendChild(el);
        swimmers.push(s);
      }
    },

    // Paddle every swimmer along for `seconds`. `radius` is the dish radius
    // in px, for the pop.
    step(seconds, radius) {
      for (const s of [...swimmers]) {
        s.age += seconds;
        let best = null;
        let bestDistance = GAME.SWIM_RANGE;
        for (const { fx, fy } of nutrients.positions()) {
          const d = Math.hypot(fx - s.fx, fy - s.fy);
          if (d < bestDistance) [best, bestDistance] = [{ fx, fy }, d];
        }
        if (best && bestDistance > 0) s.dir = [(best.fx - s.fx) / bestDistance, (best.fy - s.fy) / bestDistance];
        s.fx += s.dir[0] * GAME.SWIM_SPEED * seconds;
        s.fy += s.dir[1] * GAME.SWIM_SPEED * seconds;
        const circle = [s.fx * radius, s.fy * radius, GAME.SWIMMER_R * radius];
        if (s.age > GAME.SWIM_SECONDS || Math.hypot(s.fx, s.fy) > 0.95) {
          remove(s);
        } else if (touchedDisk(disks, [circle], radius)) {
          remove(s);
          showPop(layer.parentElement, circle, colors.stroke);
        } else if (nutrients.eatNear(s.fx, s.fy, GAME.SWIMMER_R, plant)) {
          remove(s);
        } else {
          draw(s);
        }
      }
    },
  };
}

// The player's spore: one little round cell, steered like any gal.
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

// "1 colony", "3 colonies".
const colonyCount = (n) => `${n} ${n === 1 ? 'colony' : 'colonies'}`;

// The mold game loop: like the yeast game (game.js), but you plant colonies
// instead of budding, and `target` is how many colonies win the level.
export function playMold(galEl, species, nutrients, disks, { level = 1, target = LEVELS[0].colonies } = {}) {
  const agar = document.querySelector('.agar');
  const counter = document.querySelector('.cell-count');
  const dishRadius = () => agar.clientWidth / 2;

  const playerMover = document.querySelector('.gal-mover');
  playerMover.classList.add('player', 'spore');
  const spore = sporeGroup({ mover: playerMover, agar });

  // The colonies grow on their own layer, under the spore and the disks,
  // clipped to the round dish so one by the rim doesn't spill over it.
  const layer = document.createElement('div');
  layer.className = 'colonies';
  agar.prepend(layer);
  // Bea's pods burst into little swimmers that start more pods on their own.
  const swimmers = species.pods
    ? swimmerGroup({ layer, nutrients, disks, plant: (fx, fy) => colonies.plant(fx, fy), colors: species.colors })
    : null;
  const colonies = moldColonies({
    layer, disks, nutrients, colors: species.colors,
    drops: Boolean(species.drops), wrinkled: Boolean(species.wrinkled), powdery: Boolean(species.powdery),
    pods: Boolean(species.pods), onBurst: (pod) => swimmers.release(pod.fx, pod.fy, pod.r),
  });

  let finished = false;
  let lastTime = null;
  let elapsed = 0; // for how far the zones have spread, as in game.js
  const keys = arrowKeys();
  const touch = touchSteering(agar, agar.closest('.petri-dish') ?? agar);
  const banner = levelBanner(level);

  function updateCounter() {
    const shown = Math.min(colonies.count(), target);
    counter.textContent = `Level ${level} · ${shown} / ${colonyCount(target)}`;
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
        if (colonies.count() >= target) {
          stop();
          sporeBurst(playerMover, { big: level === LEVELS.length });
          setTimeout(showWin, 400);
        }
      }
      updateCounter();
    }
    // Colonies keep spreading, and swimmers swimming, even after the level ends.
    colonies.grow(seconds);
    swimmers?.step(seconds, dishRadius());

    requestAnimationFrame(step);
  }

  function showWin() {
    const name = galEl.dataset.name;
    const gal = galEl.dataset.gal;
    track(`level-complete/${gal}/level-${level}`, `${name} finished level ${level}`);
    if (level === LEVELS.length) track(`won-all-levels/${gal}`, `${name} beat every level`);
    showFact(gal, species);
    if (level < LEVELS.length) {
      banner.show(`Level ${level} complete!`, `You grew ${colonyCount(target)}!`,
        `Play level ${level + 1}`, { next: level + 1 });
    } else {
      banner.show('You won!', `You beat all ${LEVELS.length} levels with ${colonyCount(target)}!`,
        'Play again', { next: 1 });
    }
  }

  function showGameOver(disk) {
    const { code, name } = disk.antifungal;
    showDrugFact(code, galEl.dataset.gal, species); // how the drug that got her works
    track(`game-over/${galEl.dataset.gal}/level-${level}/${code}`,
      `${galEl.dataset.name} hit ${name} on level ${level}`);
    banner.show('Game over', touchMessage(galEl.dataset.name, disk), `Try level ${level} again`,
      { startOver: level > 1 });
  }

  spreadZones(disks, 0);
  for (const el of document.querySelectorAll('.target-colonies')) el.textContent = target;
  updateCounter();
  requestAnimationFrame(step);
}

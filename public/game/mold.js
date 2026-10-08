// Molds (Fumi, Aspergillus fumigatus). Instead of budding, you're one of her
// spores floating over the agar. Land on a nutrient and a spore germinates
// there: a colony starts small and spreads out in a circle, the way mold
// colonies grow on a real plate, as threads (hyphae) grow from its edge. It's
// white and fluffy, with a greenish middle where it's started making spores,
// and counts as soon as it starts. Start enough colonies to beat the level.
// A colony that touches an antifungal disk, or the zone of inhibition around
// it, pops, the whole colony at once; the spore touching one is game over.
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

// How wide a colony is `seconds` after it started, in dish radii. Hyphae
// grow at a steady speed, so a mold colony's radius grows at a steady pace
// (not doubling, like a heap of budding cells), until it's full size.
export function colonyRadius(seconds) {
  const t = Math.min(1, Math.max(0, seconds / GAME.COLONY_GROW_SECONDS));
  return GAME.COLONY_START + (GAME.COLONY_FULL - GAME.COLONY_START) * t;
}

// The colonies in the dish. `layer` is where they're drawn, `nutrients` the
// flecks they cover up as they spread, `avoid` the list new nutrient flecks
// keep clear of (colonies join it while they're alive), and `colors` the
// pal's colors (`spores` is the green they turn). Positions and sizes are in
// fractions of the dish radius, like the disks.
export function moldColonies({ layer, disks = [], nutrients, avoid = [], colors }) {
  const colonies = [];

  function draw(colony) {
    const { el, fx, fy, r } = colony;
    el.style.left = `${50 + fx * 50}%`;
    el.style.top = `${50 + fy * 50}%`;
    el.style.width = `${r * 100}%`;
    // The greenish, sporing middle spreads out a little as it grows; the
    // rest stays white and fluffy.
    const ripe = Math.min(1, colony.age / GAME.COLONY_GROW_SECONDS);
    el.style.setProperty('--ripe', `${Math.round(ripe * 40)}%`);
  }

  function remove(colony) {
    colonies.splice(colonies.indexOf(colony), 1);
    avoid.splice(avoid.indexOf(colony), 1);
  }

  return {
    colonies,
    // How many colonies there are: each counts as soon as it starts.
    count: () => colonies.length,

    // A spore germinates at (fx, fy) and starts a colony, unless that spot is
    // already covered by one. Returns the new colony, or null.
    plant(fx, fy) {
      if (colonies.some((c) => Math.hypot(c.fx - fx, c.fy - fy) <= c.r)) return null;
      const el = document.createElement('div');
      el.className = 'colony';
      el.setAttribute('aria-hidden', 'true');
      el.style.setProperty('--spores', colors.spores);
      // A slightly uneven edge, different for each colony.
      const wobble = () => `${47 + Math.random() * 6}%`;
      el.style.borderRadius =
        `${wobble()} ${wobble()} ${wobble()} ${wobble()} / ${wobble()} ${wobble()} ${wobble()} ${wobble()}`;
      const colony = { fx, fy, r: colonyRadius(0), age: 0, el };
      draw(colony);
      layer.appendChild(el);
      colonies.push(colony);
      avoid.push(colony);
      return colony;
    },

    // Spread every colony for `seconds`, and cover up (eat) any nutrient
    // flecks they've grown over. A full-size colony stays that size.
    grow(seconds) {
      for (const colony of colonies) {
        if (colony.age < GAME.COLONY_GROW_SECONDS) {
          colony.age += seconds;
          colony.r = colonyRadius(colony.age);
          draw(colony);
        }
        nutrients.eatNear(colony.fx, colony.fy, colony.r);
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

// "1 colony", "3 colonies".
const colonyCount = (n) => `${n} ${n === 1 ? 'colony' : 'colonies'}`;

// The mold game loop: like the yeast game (game.js), but you plant colonies
// instead of budding, and `target` is how many colonies win the level.
// `avoid` is the list new nutrient flecks keep clear of (see main.js).
export function playMold(palEl, species, nutrients, disks, { level = 1, target = LEVELS[0].colonies, avoid = [] } = {}) {
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
  const colonies = moldColonies({ layer, disks, nutrients, avoid, colors: species.colors });

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
        // Landing on a nutrient: one of her spores germinates right there.
        const [[x, y, r]] = spore.body();
        if (nutrients.eatNear(x / radius, y / radius, r / radius) > 0) colonies.plant(x / radius, y / radius);
        colonies.killInZones(radius);
        if (colonies.count() >= target) {
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
      banner.show(`Level ${level} complete!`, `You grew ${colonyCount(target)}!`,
        `Play level ${level + 1}`, { next: level + 1 });
    } else {
      banner.show('You won!', `You beat all ${LEVELS.length} levels with ${colonyCount(target)}!`,
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
  for (const el of document.querySelectorAll('.target-colonies')) el.textContent = target;
  updateCounter();
  requestAnimationFrame(step);
}

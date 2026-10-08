// Fumi's game: she's a mold, so instead of swimming and budding she grows
// (see mold.js). Steer her lead tip with the arrow keys or a finger, and
// branch with Space or the Branch button. Grow to the level's number of
// cells; a tip that touches an antifungal zone dies, and the game is over
// when every tip has.
import { spreadZones, touchedDisk } from './antifungal.js';
import { GAME, LEVELS } from './config.js';
import { arrowKeys } from './keyboard.js';
import { levelEnd } from './level-end.js';
import { makeMold } from './mold.js';
import { drawMycelium, myceliumCanvas } from './mycelium.js';
import { sporeBurst } from './spores.js';
import { touchSteering } from './touch.js';

// What the game-over pop-up says when her last tip touches `disk`.
export function moldMessage(name, disk) {
  const drug = disk.antifungal.name;
  if ((disk.fullZone ?? disk.zone) > 0) return `${name}'s last growing tip reached the ${drug} zone of inhibition. Antifungals kill fungi!`;
  return `${name}'s last growing tip touched the ${drug} disk. She's resistant to ${drug}, so it has no zone, but the disk still counts!`;
}

// Which way to steer, in radians, or null to keep going: the arrow keys win
// if any are held; otherwise the way a dragging finger moved; otherwise
// toward a held-down mouse (`target`, px from the dish center).
export function steerAngle([dx, dy], dragged, target, tip) {
  if (dx !== 0 || dy !== 0) return Math.atan2(dy, dx);
  if (Math.hypot(...dragged) > 0.5) return Math.atan2(dragged[1], dragged[0]);
  if (target) return Math.atan2(target[1] - tip[1], target[0] - tip[0]);
  return null;
}

export function playMold(palEl, species, nutrients, disks, { level = 1, target = LEVELS[0].target } = {}) {
  const M = GAME.MOLD;
  const agar = document.querySelector('.agar');
  const dish = agar.closest('.petri-dish') ?? agar;
  const counter = document.querySelector('.cell-count');
  const dishRadius = () => agar.clientWidth / 2;
  const { colors } = species;

  const mold = makeMold();
  const canvas = myceliumCanvas(agar);

  // Her face rides her lead tip; her spore-stalk picture isn't used in the
  // dish.
  palEl.setAttribute('hidden', '');
  const face = document.querySelector('.pal-mover');
  face.classList.add('player', 'mold-tip');
  face.style.width = `${M.TIP_SIZE * 50}%`;
  face.insertAdjacentHTML('beforeend', `
    <svg class="tip-face" viewBox="-12 -12 24 24" aria-hidden="true">
      <circle r="10" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.4" />
      <circle cx="-3.6" cy="-1" r="1.8" fill="${colors.dark}" />
      <circle cx="3.6" cy="-1" r="1.8" fill="${colors.dark}" />
      <path d="M-2 3 Q0 5 2 3" stroke="${colors.dark}" stroke-width="1.2" fill="none" stroke-linecap="round" />
    </svg>`);

  // Branch: Space, or the button under the dish.
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pick-btn branch-btn';
  button.textContent = 'Branch';
  dish.after(button);
  let finished = false;
  const branch = () => {
    if (!finished) mold.branch();
  };
  button.addEventListener('click', branch);
  window.addEventListener('keydown', (event) => {
    if (event.key !== ' ') return;
    event.preventDefault(); // don't scroll the page or press a focused button
    branch();
  });

  const keys = arrowKeys();
  const touch = touchSteering(agar, dish);
  const end = levelEnd(palEl, species, { level, target });
  let lastTime = null;
  let elapsed = 0; // how long the level has run, for how far the zones spread
  let lastHit = null;

  function updateCounter() {
    const shown = Math.min(mold.cellCount(), target);
    counter.textContent = `Level ${level} · ${shown} / ${target} cells`;
  }

  function finish() {
    finished = true;
    keys.stop();
    touch.stop();
    nutrients.stop();
    button.disabled = true;
  }

  function step(time) {
    const seconds = lastTime === null ? 0 : Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;
    const radius = dishRadius();

    if (!finished && radius > 0) {
      elapsed += seconds;
      spreadZones(disks, elapsed);
      const tip = mold.lead.tip.map((v) => v * radius);
      mold.update(seconds, steerAngle(keys.direction(), touch.drag(), touch.target(), tip));

      // Nutrients touching any part of her feed her.
      let eaten = nutrients.eatNear(...mold.lead.tip, M.TIP_SIZE / 2);
      for (const thread of mold.threads) {
        for (const [x, y] of [...thread.path, thread.tip]) eaten += nutrients.eatNear(x, y, M.WIDTH);
      }
      mold.feed(eaten);

      // A tip that touches an antifungal dies there.
      for (const thread of mold.threads) {
        if (!thread.alive) continue;
        const size = thread === mold.lead ? M.TIP_SIZE / 2 : M.WIDTH / 2;
        const hit = touchedDisk(disks, [[thread.tip[0] * radius, thread.tip[1] * radius, size * radius]], radius);
        if (hit) {
          lastHit = hit;
          mold.kill(thread);
        }
      }

      updateCounter();
      button.disabled = !mold.canBranch(); // grayed out until she's eaten
      if (!mold.alive()) {
        finish();
        face.classList.add('killed');
        setTimeout(() => end.gameOver(lastHit, moldMessage(palEl.dataset.name, lastHit)), 500);
      } else if (mold.cellCount() >= target) {
        finish();
        sporeBurst(face, { big: level === LEVELS.length });
        setTimeout(end.win, 600);
      }
    }

    face.style.transform = `translate(${mold.lead.tip[0] * radius}px, ${mold.lead.tip[1] * radius}px)`;
    drawMycelium(canvas, agar, mold, colors);
    requestAnimationFrame(step);
  }

  spreadZones(disks, 0);
  for (const el of document.querySelectorAll('.target-cells')) el.textContent = target;
  updateCounter();
  requestAnimationFrame(step);
}

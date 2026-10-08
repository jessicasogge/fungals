// A mold (Fumi) doesn't bud and doesn't swim: she grows. She starts as a
// spore, and her threads (hyphae) stretch out from their tips. You steer her
// lead tip, the one with her face; Branch sprouts a new tip off it, about 45
// degrees to one side. Every tip grows on its own, straight ahead.
//
// Growing uses up stored growth, which is shared by all her tips. Nutrients
// that touch any part of her refill it, with enough for every growing tip
// (a real mold moves food along its threads to all its tips; see feed), so
// more tips grow her faster. With none stored, only her lead tip creeps
// along, slowly.
//
// Her cells are the lengths of her threads: every MOLD.CELL_LENGTH of thread
// is one more cell, on top of the spore she started as.
//
// A tip that touches an antifungal zone dies there (see kill); the thread
// behind it stays. If her lead tip dies, her face moves to another live one,
// and she's only done for when every tip is dead.
//
// Everything here is in fractions of the dish radius, with the center at
// [0, 0]. Nothing here touches the page; see mold-game.js and mycelium.js.
import { GAME } from './config.js';

export function makeMold({ start = [0, 0], angle = -Math.PI / 2 } = {}) {
  const M = GAME.MOLD;
  const threads = [];
  let side = 1; // which side the next branch sprouts on
  let cooldown = 0; // seconds until she can branch again

  function addThread(at, heading) {
    const thread = {
      path: [[...at]], // points along the thread, the newest last
      tip: [...at], // the growing end
      angle: heading, // which way the tip is growing, in radians
      length: 0,
      alive: true,
      stopped: false, // a branch that reached the rim stops there
    };
    threads.push(thread);
    return thread;
  }

  const mold = {
    threads,
    lead: addThread(start, angle),
    growth: M.START_GROWTH,

    // The tips that can still grow.
    growing: () => threads.filter((t) => t.alive && !t.stopped),
    alive: () => threads.some((t) => t.alive),
    cellCount: () => 1 + threads.reduce((sum, t) => sum + Math.floor(t.length / M.CELL_LENGTH), 0),

    // Grow every tip for `seconds`. `want` is which way to steer her lead
    // tip, in radians, or null to keep going the way she's going. She turns
    // in a curve, never a sharp corner.
    update(seconds, want = null) {
      cooldown = Math.max(0, cooldown - seconds);
      const tips = mold.growing();
      if (tips.length === 0 || seconds <= 0) return;
      let step = M.TIP_SPEED * seconds;
      if (step * tips.length > mold.growth) step = mold.growth / tips.length;
      mold.growth = Math.max(0, mold.growth - step * tips.length);
      for (const thread of tips) {
        const lead = thread === mold.lead;
        // With nothing stored, her lead tip still creeps.
        const distance = lead ? Math.max(step, M.CREEP_SPEED * seconds) : step;
        if (distance <= 0) continue;
        if (lead && want !== null) turn(thread, want, distance);
        grow(thread, distance);
      }
    },

    // Whether she can branch now: she needs stored growth for a new tip to
    // grow, and a moment since the last one.
    canBranch: () => cooldown === 0 && mold.growth > 0 && mold.lead.alive,

    // Sprout a new tip from her lead tip, about 45 degrees off it, on
    // alternating sides. Returns the new thread, or null if she can't now.
    branch() {
      if (!mold.canBranch()) return null;
      cooldown = M.BRANCH_COOLDOWN;
      side = -side;
      return addThread(mold.lead.tip, mold.lead.angle + side * M.BRANCH_ANGLE);
    },

    // Eating `count` nutrients stores more growth, enough for each tip
    // that's still growing.
    feed(count) {
      mold.growth += count * M.NUTRIENT_GROWTH * Math.max(1, mold.growing().length);
    },

    // A tip touched an antifungal: it dies there. If it was her lead, her
    // face moves to her newest live tip, which keeps growing even if it had
    // stopped at the rim (her lead slides along the rim instead).
    kill(thread) {
      thread.alive = false;
      if (thread !== mold.lead) return;
      const next = threads.findLast((t) => t.alive);
      if (!next) return;
      next.stopped = false;
      mold.lead = next;
    },
  };

  // Turn toward `want` by no more than a curve of radius MOLD.TURN allows
  // over `distance`.
  function turn(thread, want, distance) {
    const diff = Math.atan2(Math.sin(want - thread.angle), Math.cos(want - thread.angle));
    const most = distance / M.TURN;
    thread.angle += Math.max(-most, Math.min(most, diff));
  }

  function grow(thread, distance) {
    let next = [
      thread.tip[0] + Math.cos(thread.angle) * distance,
      thread.tip[1] + Math.sin(thread.angle) * distance,
    ];
    const out = Math.hypot(...next);
    if (out > M.RIM) {
      if (thread !== mold.lead) {
        thread.stopped = true;
        return;
      }
      // Her lead tip slides along the rim, turning to follow it.
      next = [(next[0] * M.RIM) / out, (next[1] * M.RIM) / out];
      const around = Math.atan2(next[1], next[0]);
      const ways = [around + Math.PI / 2, around - Math.PI / 2];
      const off = (a) => Math.abs(Math.atan2(Math.sin(a - thread.angle), Math.cos(a - thread.angle)));
      thread.angle = off(ways[0]) <= off(ways[1]) ? ways[0] : ways[1];
    }
    thread.length += Math.hypot(next[0] - thread.tip[0], next[1] - thread.tip[1]);
    thread.tip = next;
    const [lx, ly] = thread.path.at(-1);
    if (Math.hypot(next[0] - lx, next[1] - ly) > M.POINT) thread.path.push([...next]);
  }

  return mold;
}

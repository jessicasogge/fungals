// The pop-up at the end of a level, shared by the yeasts (game.js) and the
// mold (mold-game.js): level complete, won every level, or game over, with a
// fun fact. Its buttons go to the next level, back to level 1, or try this
// level again; after a game over, "Start over" goes back to level 1.
import { LEVELS } from './config.js';
import { showFact } from './facts.js';
import { goTo } from './loading.js';
import { track } from './track.js';

export function levelEnd(palEl, species, { level, target }) {
  let nextLevel = level;
  function goToLevel(n) {
    const url = new URL(window.location.href);
    url.searchParams.set('level', n);
    goTo(url.toString());
  }
  document.querySelector('.play-again').addEventListener('click', () => goToLevel(nextLevel));
  document.querySelector('.start-over').addEventListener('click', () => goToLevel(1));

  function showBanner(title, message, button, { startOver = false } = {}) {
    const banner = document.querySelector('.win-banner');
    banner.querySelector('h2').textContent = title;
    banner.querySelector('.win-message').textContent = message;
    banner.querySelector('.play-again').textContent = button;
    banner.querySelector('.start-over').hidden = !startOver;
    banner.removeAttribute('hidden');
    banner.querySelector('.play-again').focus();
  }

  return {
    win() {
      const name = palEl.dataset.name;
      const pal = palEl.dataset.pal;
      track(`level-complete/${pal}/level-${level}`, `${name} finished level ${level}`);
      if (level === LEVELS.length) track(`won-all-levels/${pal}`, `${name} beat every level`);
      showFact(pal, species);
      if (level < LEVELS.length) {
        nextLevel = level + 1;
        showBanner(`Level ${level} complete!`, `You grew a colony of ${target} cells!`,
          `Play level ${nextLevel}`);
      } else {
        nextLevel = 1;
        showBanner('You won!', `You beat all ${LEVELS.length} levels with a colony of ${target} cells!`,
          'Play again');
      }
    },
    // `message` says what happened.
    gameOver(disk, message) {
      showFact(palEl.dataset.pal, species);
      const { code, name } = disk.antifungal;
      track(`game-over/${palEl.dataset.pal}/level-${level}/${code}`,
        `${palEl.dataset.name} hit ${name} on level ${level}`);
      showBanner('Game over', message, `Try level ${level} again`,
        { startOver: level > 1 }); // on level 1 they'd do the same thing
    },
  };
}

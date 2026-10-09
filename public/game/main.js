// Entry point for the petri dish page: find the pal and level picked in the
// URL and start the game with them:
//   petri-dish.html?pal=sasha&level=2
import { antifungalsFor, placeAntifungals } from './antifungal.js';
import { GAME, LEVELS, SPECIES } from './config.js';
import { playGame } from './game.js';
import { playMold } from './mold-game.js';
import { speciesName } from './italics.js';
import { pageReady, watchLoading } from './loading.js';
import { scatterNutrients } from './nutrients.js';
import { dishPal, PALS } from './pals.js';
import { watchInputMode } from './touch.js';

// Show touch or arrow-key directions, whichever fits the device.
watchInputMode();
// "Growing the colony…" while the next screen loads.
watchLoading();

// Every pal's drawing, hidden: yours is shown below.
document.querySelector('.pal-mover').append(...PALS.map(dishPal));

const params = new URLSearchParams(window.location.search);
const choice = params.get('pal');
// Compare names rather than building a CSS selector from the address, so a
// mangled link (e.g. ?pal=sasha"]) can't crash the page.
const pal = [...document.querySelectorAll('.dish-pal')].find((el) => el.dataset.pal === choice);
// Level 1 unless the URL says otherwise.
const levelNumber = Math.min(Math.max(parseInt(params.get('level'), 10) || 1, 1), LEVELS.length);
const level = LEVELS[levelNumber - 1];

if (!pal) {
  // No pal (or an unknown one) in the URL: send them back to choose.
  window.location.replace('./pal-picker.html');
} else {
  start();
  // The dish is set up: take the loading card away.
  pageReady();
}

function start() {
  pal.removeAttribute('hidden');
  document.title = `FunGals | ${pal.dataset.name} | Level ${levelNumber}`;
  const species = SPECIES[pal.dataset.pal];
  // Her name and species above the dish.
  const title = document.querySelector('.pal-name');
  title.textContent = pal.dataset.name;
  title.style.color = species.color;
  document.querySelector('.species-name').replaceChildren(...speciesName(species.scientific));
  if (species.kind === 'mold') moldDirections();
  const disks = placeAntifungals(antifungalsFor(species.antifungals, level.disks));
  const count = species.kind === 'mold' ? undefined : GAME.YEAST_NUTRIENTS;
  const nutrients = scatterNutrients({ avoid: disks, count });
  const play = species.kind === 'mold' ? playMold : playGame;
  play(pal, species, nutrients, disks, { level: levelNumber, target: level.target });
}

// A mold grows instead of swimming and budding, so her directions say so.
function moldDirections() {
  const span = (className, text) => {
    const el = document.createElement('span');
    el.className = className;
    el.textContent = text;
    return el;
  };
  const target = document.createElement('span');
  target.className = 'target-cells';
  document.querySelector('.how-to-play').replaceChildren(
    span('for-keys', 'Fumi is a mold: she grows instead of swimming. Hold the arrow keys to grow her tip that way, and press Space to branch.'),
    span('for-touch', 'Fumi is a mold: she grows instead of swimming. Slide your finger to grow her tip that way, and tap Branch to branch.'),
    ' Nutrients that touch any part of her feed all her tips, so her branches grow on their own, and her threads add cells as they grow: grow to ',
    target,
    ' cells.',
    document.createElement('br'),
    "A tip that touches an antifungal disk or its zone dies, but she keeps growing as long as any tip is alive. Watch out: the zones spread as the drug soaks into the agar!",
  );
}

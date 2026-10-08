// Entry point for the petri dish page: find the pal and level picked in the
// URL and start the game with them:
//   petri-dish.html?pal=sasha&level=2
import { antifungalsFor, placeAntifungals } from './antifungal.js';
import { LEVELS, SPECIES } from './config.js';
import { playGame } from './game.js';
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
  const nutrients = scatterNutrients({ avoid: disks });
  playGame(pal, species, nutrients, disks, { level: levelNumber, target: level.target });
}

// A mold leaves a thread and grows walls instead of budding, so her
// directions say so. On level 1 a card explains it once, until she moves or
// the card is closed.
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
    span('for-keys', 'Use the arrow keys to swim.'),
    span('for-touch', 'Touch the dish and slide your finger to swim.'),
    ' Fumi leaves a thread behind her. Each nutrient she eats adds a wall to her thread, and each wall is a cell: grow to ',
    target,
    ' cells.',
    document.createElement('br'),
    "Eating also sprouts a branch, which can eat too. Don't touch the antifungal disks or the clear zones around them, and watch out: the zones spread as the drug soaks into the agar!",
  );
  if (levelNumber !== 1) return;
  const card = document.createElement('div');
  card.className = 'mold-hint';
  card.setAttribute('role', 'note');
  const text = document.createElement('p');
  text.textContent = "Fumi is a mold: she grows like a thread instead of budding. Each nutrient adds a wall to her thread, and each wall is a cell.";
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pick-btn';
  button.textContent = 'Got it';
  card.append(text, button);
  const dish = document.querySelector('.petri-dish');
  dish.append(card);
  const close = () => card.remove();
  button.addEventListener('click', close);
  dish.addEventListener('pointerdown', close, { once: true });
  window.addEventListener('keydown', (event) => {
    if (event.key.startsWith('Arrow')) close();
  });
}

// The FunGals family tree: one branch at a time. Tap a branch card to go in,
// tap a step in the trail above to go back up, and tap a gal to see her
// branches and all her fun facts.
import { SPECIES } from './config.js';
import { speciesName, withItalics } from './italics.js';
import { pageReady, watchLoading } from './loading.js';
import { galById, galTile } from './gals.js';
import { branchById, galsOn, lineage, TREE } from './tree.js';

// "Growing the colony…" while the next screen loads.
watchLoading();

const trail = document.querySelector('.tree-trail');
const note = document.querySelector('.tree-note');
const view = document.querySelector('.tree-view');
const card = document.querySelector('.tree-gal');
const home = document.querySelector('.tree-home');
const back = document.querySelector('.tree-back');
let branch = TREE;

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

// Where you are, as a trail of steps; each step above this one goes back up.
// At the top of the tree there's nowhere to go back to, so no trail.
function showTrail() {
  const top = branch === TREE;
  trail.hidden = top;
  note.hidden = top;
  home.hidden = !top;
  back.hidden = top;
  const steps = lineage(branch.id);
  trail.replaceChildren(...steps.flatMap((step, i) => {
    if (i === steps.length - 1) return [element('span', 'tree-here', step.name)];
    const up = element('button', 'tree-step', step.name);
    up.type = 'button';
    up.addEventListener('click', () => go(step, { back: true }));
    return [up, element('span', 'tree-sep', '›')];
  }));
  note.textContent = branch.note;
}

// A card for a smaller branch: its name, its note, and the faces of the
// gals on it.
function branchCard(kid) {
  const button = element('button', 'tree-branch');
  button.type = 'button';
  button.dataset.branch = kid.id;
  const title = element('span', 'tree-branch-name');
  title.append(element('b', '', kid.name));
  if (kid.sci) title.append(' ', element('i', '', kid.sci));
  const ids = galsOn(kid);
  const count = element('span', 'tree-count', `${ids.length} ${ids.length === 1 ? 'gal' : 'gals'} ›`);
  const faces = element('span', 'tree-faces');
  faces.append(...ids.map((id) => galTile(galById(id))));
  button.append(title, count, element('span', 'tree-branch-note', kid.note), faces);
  button.addEventListener('click', () => go(kid));
  return button;
}

// A button for a gal at the tip of a branch, like the ones in Who's That Gal?.
function galButton(id) {
  const gal = galById(id);
  const button = element('button', 'gal-btn tree-gal-btn');
  button.type = 'button';
  button.dataset.gal = id;
  button.setAttribute('aria-pressed', 'false');
  const name = element('span', '', gal.name);
  name.style.color = SPECIES[id].color;
  button.append(galTile(gal), name);
  button.addEventListener('click', () => openGal(id));
  return button;
}

function show({ back = false } = {}) {
  showTrail();
  const tips = branch.kids.every((kid) => kid.leaf);
  const list = element('div', `${tips ? 'gal-grid tree-tips' : 'tree-branches'} tree-slide${back ? ' back' : ''}`);
  list.append(...branch.kids.map((kid) => (kid.leaf ? galButton(kid.leaf) : branchCard(kid))));
  view.replaceChildren(list);
}

function go(to, { back = false } = {}) {
  branch = to;
  card.hidden = true;
  show({ back });
}

// Her card: her name, species, her branches, and all her fun facts.
// Tapping her again closes it.
function openGal(id) {
  const again = !card.hidden && card.dataset.gal === id;
  for (const b of view.querySelectorAll('.tree-gal-btn')) b.setAttribute('aria-pressed', String(!again && b.dataset.gal === id));
  if (again) {
    card.hidden = true;
    return;
  }
  card.dataset.gal = id;
  const gal = galById(id);
  const name = element('h2', 'tree-gal-name', gal.name);
  name.style.color = SPECIES[id].color;
  const species = element('p', 'tree-gal-species');
  species.append(...speciesName(SPECIES[id].scientific));
  const top = element('div', 'tree-gal-top');
  const words = element('div');
  words.append(name, species);
  top.append(galTile(gal), words);
  const line = element('p', 'tree-gal-line', lineage(id).map((b) => b.name).join(' › '));
  const facts = element('ul', 'tree-facts');
  facts.append(...SPECIES[id].facts.map((fact) => {
    const item = element('li');
    item.append(...withItalics(fact));
    return item;
  }));
  card.replaceChildren(top, line, facts);
  card.hidden = false;
}

// Back goes up to the branch this one is on.
back.addEventListener('click', () => go(branch.parent, { back: true }));

// Open a branch from the address, like family-tree.html#club, so a link can
// land right on it.
const start = branchById(window.location.hash.slice(1));
if (start && !start.leaf) branch = start;
show();

// All filled in: take the loading card away.
pageReady();

// "Did you know?" facts on the end-of-level pop-up. When she wins, a random
// fact about your gal from her `facts` in config.js, never the same one twice
// in a row. When she hits a disk, how that antifungal works instead
// (ANTIFUNGAL_FACTS in config.js), or a fact about her if that drug has none.
//
// A fact can put words in italics between asterisks, for scientific names
// of other species: "Candi's cousin *Candida auris* was ...".

import { ANTIFUNGAL_FACTS } from './config.js';
import { withItalics } from './italics.js';

// Write `fact` into `element`, with the parts between asterisks in <i>.
export function writeFact(element, fact) {
  element.replaceChildren(...withItalics(fact));
}

// A random fact from `facts`, avoiding `last` if there's any other choice.
export function pickFact(facts = [], last = null, random = Math.random) {
  const choices = facts.length > 1 ? facts.filter((f) => f !== last) : facts;
  if (choices.length === 0) return null;
  return choices[Math.floor(random() * choices.length)];
}

// Show a random fact about `gal` (her key, e.g. "sasha") in the pop-up, or
// hide the fact line if `species` has none. Remembers the fact for the rest
// of the visit, since every level loads a fresh page.
export function showFact(gal, species) {
  const line = document.querySelector('.fun-fact');
  if (!line) return;
  const key = `fungals-last-fact-${gal}`;
  let last = null;
  try {
    last = sessionStorage.getItem(key);
  } catch {
    // No storage (private browsing, etc.): repeats are possible, that's all.
  }
  const fact = pickFact(species.facts, last);
  if (!fact) {
    line.hidden = true;
    return;
  }
  writeFact(line.querySelector('.fun-fact-text'), fact);
  line.hidden = false;
  try {
    sessionStorage.setItem(key, fact);
  } catch {
    // See above.
  }
}

// Show how the antifungal with disk code `code` (e.g. "VOR") works. If
// there's nothing written for that drug, show a fact about `gal` instead,
// as showFact does.
export function showDrugFact(code, gal, species) {
  const fact = ANTIFUNGAL_FACTS[code];
  if (!fact) {
    showFact(gal, species);
    return;
  }
  const line = document.querySelector('.fun-fact');
  if (!line) return;
  writeFact(line.querySelector('.fun-fact-text'), fact);
  line.hidden = false;
}

// Hide the fact line.
export function hideFact() {
  const line = document.querySelector('.fun-fact');
  if (line) line.hidden = true;
}

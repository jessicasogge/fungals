// Who’s That Gal? (whos-that-gal.html): fun facts from quiz-facts.js

import { withItalics } from './italics.js';

// The most gals Who's That Gal? shows at once (two rows on a phone, three
// on a computer).
export const MAX_CHOICES = 12;

// The gals to offer for a fact about `answer`: all of them if they fit, or
// else her plus a random pick of the others, up to `max`, kept in the usual
// order so she's never given away by where she sits.
export function pickChoices(gals, answer, max = MAX_CHOICES, random = Math.random) {
  if (gals.length <= max) return [...gals];
  const others = gals.filter((gal) => gal.id !== answer.id);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const keep = new Set([answer.id, ...others.slice(0, max - 1).map((gal) => gal.id)]);
  return gals.filter((gal) => keep.has(gal.id));
}

// Shuffled { gal, fact } pairs
export function factDeck(gals, facts, random = Math.random) {
  const deck = gals.flatMap((gal) => facts[gal.id].map((fact) => ({ gal, fact })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Placeholder for the gal's name
function blank(startsSentence) {
  const gap = document.createElement('span');
  gap.className = 'fact-blank';
  gap.textContent = startsSentence ? 'This gal' : 'this gal';
  return gap;
}

const SENTENCE_END = /(^|[.!?]["”]?\s+)["“]?$/;

// Format fact text with name blanks and italics
export function withBlanks(fact, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const word = new RegExp(`\\b${escaped}\\b`);
  // Her name used as a describing word reads oddly as "this gal": "some
  // Candi strains" becomes "some strains of this gal", not "some this gal
  // strains".
  const reworded = fact.replace(new RegExp(`\\b${escaped} (strains|cells|types)\\b`, 'g'), `$1 of ${name}`);
  let before = ''; // the fact so far, to tell when a sentence starts
  return withItalics(reworded).flatMap((node) => {
    if (node.nodeType !== Node.TEXT_NODE) {
      before += node.textContent;
      return [node];
    }
    const nodes = [];
    node.textContent.split(word).forEach((part, i) => {
      if (i > 0) nodes.push(blank(SENTENCE_END.test(before)));
      if (part) nodes.push(document.createTextNode(part));
      before += (i > 0 ? name : '') + part;
    });
    return nodes;
  });
}

export function fillBlanks(element, name, color) {
  for (const gap of element.querySelectorAll('.fact-blank')) {
    gap.classList.add('filled');
    gap.style.color = color;
    gap.textContent = name;
  }
}

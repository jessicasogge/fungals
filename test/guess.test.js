// @vitest-environment jsdom
// Who’s That Gal? facts: shuffled into a deck, with "this gal" in place of the pal's name.
import { describe, expect, it } from 'vitest';
import { factDeck, fillBlanks, withBlanks } from '../public/game/guess.js';
import { PALS } from '../public/game/pals.js';
import { QUIZ_FACTS } from '../public/game/quiz-facts.js';

describe('the quiz facts', () => {
  // These are picked to point to one pal each, sometimes reworded from the
  // pop-up facts in config.js, so they're checked here on their own.
  it.each(PALS.map((pal) => [pal.name, pal.id]))('%s has quiz facts that each name her', (name, id) => {
    const facts = QUIZ_FACTS[id];
    expect(facts.length).toBeGreaterThan(0);
    expect(new Set(facts).size).toBe(facts.length);
    for (const fact of facts) {
      // Says whose it is, so "this gal" can take her name's place.
      expect(fact, fact).toMatch(new RegExp(`\\b${name}\\b`));
      expect(fact.split('*').length % 2, fact).toBe(1); // italics come in pairs
      expect(fact.replaceAll('*', ''), fact).toMatch(/^["A-Z0-9].*[.!"]$/); // a full sentence
    }
  });

  it('covers every pal in the game, and only them', () => {
    expect(Object.keys(QUIZ_FACTS).sort()).toEqual(PALS.map((pal) => pal.id).sort());
  });
});

describe('the deck of facts', () => {
  it('has every quiz fact about every pal, once each', () => {
    const deck = factDeck(PALS, QUIZ_FACTS);
    const all = PALS.flatMap((pal) => QUIZ_FACTS[pal.id].map((fact) => `${pal.id}: ${fact}`));
    expect(deck.map(({ pal, fact }) => `${pal.id}: ${fact}`).sort()).toEqual(all.sort());
  });

  it('is shuffled', () => {
    const order = (random) => factDeck(PALS, QUIZ_FACTS, random).map(({ fact }) => fact);
    expect(order(() => 0)).not.toEqual(order(() => 0.999));
  });
});

describe('swapping her name for "this gal"', () => {
  const shown = (fact, name) => {
    const p = document.createElement('p');
    p.append(...withBlanks(fact, name));
    return p;
  };

  it('swaps every mention of her, possessives too', () => {
    expect(shown("Candi's cells switch shapes, so Candi can spread.", 'Candi').textContent)
      .toBe("This gal's cells switch shapes, so this gal can spread.");
  });

  it('starts every sentence with a capital', () => {
    expect(shown('Sacchi buds. Sacchi bakes! "Sacchi" is a name.', 'Sacchi').textContent)
      .toBe('This gal buds. This gal bakes! "This gal" is a name.');
    expect(shown('In bread dough, Sacchi makes bubbles.', 'Sacchi').textContent)
      .toBe('In bread dough, this gal makes bubbles.');
  });

  it('is plain text, with no question mark', () => {
    const p = shown('Sacchi buds.', 'Sacchi');
    expect(p.querySelector('.fact-blank').textContent).toBe('This gal');
    expect(p.textContent).not.toContain('?');
  });

  it('only swaps whole words', () => {
    expect(shown('Candi is a Candida, and so is Candi\'s cousin.', 'Candi').textContent)
      .toBe("This gal is a Candida, and so is this gal's cousin.");
  });

  it('says "strains of this gal", not "this gal strains"', () => {
    expect(shown('Some Candi strains resist fluconazole, unlike most Sacchi cells.', 'Candi').textContent)
      .toBe('Some strains of this gal resist fluconazole, unlike most Sacchi cells.');
    expect(shown('Labs grow the Sacchi types they need.', 'Sacchi').textContent)
      .toBe('Labs grow the types of this gal they need.');
  });

  it('keeps other species in italics', () => {
    const p = shown("Candi's cousin *Candida auris* resists many drugs. Candi doesn't.", 'Candi');
    expect(p.textContent).toBe("This gal's cousin Candida auris resists many drugs. This gal doesn't.");
    expect(p.querySelector('i').textContent).toBe('Candida auris');
  });

  it.each(PALS.map((pal) => [pal.name, pal.id]))("never gives %s's name away", (name, id) => {
    for (const fact of QUIZ_FACTS[id]) {
      const text = shown(fact, name).textContent;
      expect(text, fact).not.toMatch(new RegExp(`\\b${name}\\b`));
      expect(text, fact).toMatch(/\b[Tt]his gal\b/);
      expect(text, fact).not.toMatch(/\bthis gal (strains|cells|types)\b/);
      expect(text, fact).toMatch(/^["A-Z0-9]/);
    }
  });
});

describe('filling the blanks', () => {
  it('puts her name in every blank, in her color', () => {
    const p = document.createElement('p');
    p.append(...withBlanks("Sacchi's bubbles help Sacchi bake.", 'Sacchi'));
    fillBlanks(p, 'Sacchi', '#15803d');
    expect(p.textContent).toBe("Sacchi's bubbles help Sacchi bake.");
    for (const gap of p.querySelectorAll('.fact-blank')) {
      expect(gap.classList).toContain('filled');
      expect(gap.style.color).toBe('rgb(21, 128, 61)');
    }
  });
});

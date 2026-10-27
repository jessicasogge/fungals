// tree.js: how the gals are related, simplified to the gals in the game.
import { describe, expect, it } from 'vitest';
import { GALS } from '../public/game/gals.js';
import { branchById, cousins, galsOn, lineage, TREE } from '../public/game/tree.js';

const names = (branches) => branches.map((b) => b.name);

describe('the family tree', () => {
  it('has every gal in the game on it exactly once, and no one else but you', () => {
    const on = galsOn(TREE);
    expect([...on].sort()).toEqual(GALS.map((gal) => gal.id).sort());
    expect(new Set(on).size).toBe(on.length);
    expect(branchById('you').leaf).toBe('you');
  });

  it('gives every branch a name and a short note', () => {
    (function check(branch) {
      if (branch.leaf) return;
      expect(branch.id).toMatch(/^[a-z]+$/);
      expect(branch.name.length).toBeGreaterThan(0);
      expect(branch.note.length).toBeLessThanOrEqual(90);
      branch.kids.forEach(check);
    })(TREE);
  });

  it("traces a gal's branches from the top of the tree down to hers", () => {
    expect(names(lineage('neve'))).toEqual(['Fungi + animals', 'Fungi', 'Dikarya', 'Club fungi', 'Mushrooms and jelly fungi']);
    expect(names(lineage('sasha'))).toEqual(['Fungi + animals', 'Fungi', 'Dikarya', 'Sac fungi', 'Budding yeasts']);
    expect(names(lineage('bea'))).toEqual(['Fungi + animals', 'Fungi', 'Chytrids']);
    // A branch's own trail ends with itself.
    expect(names(lineage('club'))).toEqual(['Fungi + animals', 'Fungi', 'Dikarya', 'Club fungi']);
  });

  it('knows the science: Neve is a club fungus, and Olive is a cousin of Maizey', () => {
    expect(lineage('neve')).toContain(branchById('club'));
    expect(lineage('neve')).not.toContain(branchById('sac'));
    expect(lineage('olive').at(-1)).toBe(lineage('maizey').at(-1));
  });

  it('finds the gals on any branch, however far down', () => {
    expect(galsOn(branchById('molds'))).toEqual(['fumi', 'miri', 'penelope', 'trixie', 'rosie']);
    expect(galsOn(branchById('animals'))).toEqual([]);
    expect(branchById('nope')).toBeNull();
  });

  it("names a gal's closest cousins: her own branch, the one above if she's alone, or none for Bea", () => {
    expect(cousins('neve')).toEqual({ near: true, ids: ['velma', 'ruby'] });
    expect(cousins('rosie')).toEqual({ near: false, ids: ['fumi', 'miri', 'penelope', 'trixie'] });
    expect(cousins('bea')).toEqual({ near: true, ids: [] });
  });
});

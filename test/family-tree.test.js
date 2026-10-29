// @vitest-environment jsdom
// The family tree page: one branch at a time. Tap a branch to go in, a step
// in the trail to go back up, and a gal to see her branches and fun facts.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SPECIES } from '../public/game/config.js';
import { GALS } from '../public/game/gals.js';

const page = readFileSync(resolve(process.cwd(), 'public/family-tree.html'), 'utf8');

async function open(hash = '') {
  window.location.hash = hash;
  document.body.outerHTML = page.slice(page.indexOf('<body'), page.indexOf('</body>'));
  vi.resetModules();
  await import('../public/game/family-tree.js');
}

const branch = (id) => document.querySelector(`.tree-branch[data-branch="${id}"]`);
const gal = (id) => document.querySelector(`.tree-gal-btn[data-gal="${id}"]`);
const trail = () => [...document.querySelectorAll('.tree-trail > :not(.tree-sep)')].map((s) => s.textContent);
const note = () => document.querySelector('.tree-note').textContent;
const card = () => document.querySelector('.tree-gal');

afterEach(() => { window.location.hash = ''; });

describe('the family tree page', () => {
  it('opens at the top, the fungi, with a card for the chytrids and one for the rest', async () => {
    await open();
    // At the top there's no trail to go back up, and no note.
    expect(document.querySelector('.tree-trail').hidden).toBe(true);
    expect(document.querySelector('.tree-note').hidden).toBe(true);
    expect([...document.querySelectorAll('.tree-branch')].map((b) => b.dataset.branch)).toEqual(['chytrids', 'dikarya']);
    // Every gal but Bea, the only chytrid.
    expect(branch('dikarya').querySelector('.tree-count').textContent).toBe(`${GALS.length - 1} gals ›`);
    expect(branch('dikarya').querySelectorAll('.tree-faces .gal-icon')).toHaveLength(GALS.length - 1);
    expect(document.querySelector('.loading-overlay').hidden).toBe(true);
  });

  it("goes in one branch at a time, showing each one's science name", async () => {
    await open();
    expect(branch('chytrids').querySelector('.tree-branch-name').textContent).toBe('Chytrids Chytridiomycota');
    expect(branch('chytrids').querySelector('.tree-count').textContent).toBe('1 gal ›');
    branch('dikarya').click();
    branch('club').click();
    expect(trail()).toEqual(['Fungi', 'Dikarya', 'Club fungi']);
    expect(document.querySelector('.tree-trail').hidden).toBe(false);
    expect(note()).toBe('Make their spores on tiny club-shaped cells.');
    expect(document.querySelector('.tree-view > div').className).toContain('tree-branches');
  });

  it('shows the gals at the tip of a branch, in her own color', async () => {
    await open('#mushrooms');
    expect([...document.querySelectorAll('.tree-gal-btn')].map((b) => b.dataset.gal)).toEqual(['velma', 'ruby', 'neve']);
    expect(gal('neve').querySelector('span:last-child').style.color).toBeTruthy();
    expect(document.querySelector('.tree-view > div').className).toContain('gal-grid');
  });

  it('goes back up from a step in the trail', async () => {
    await open('#budding');
    const steps = [...document.querySelectorAll('.tree-step')];
    expect(steps.map((s) => s.textContent)).toEqual(['Fungi', 'Dikarya', 'Sac fungi']);
    steps[1].click();
    expect(trail()).toEqual(['Fungi', 'Dikarya']);
    expect(document.querySelector('.tree-view > div').classList).toContain('back');
  });

  it('opens a gal card with her branches and all her fun facts, and closes it when she is tapped again', async () => {
    await open('#mushrooms');
    expect(card().hidden).toBe(true);
    gal('neve').click();
    expect(card().hidden).toBe(false);
    expect(gal('neve').getAttribute('aria-pressed')).toBe('true');
    expect(card().querySelector('.tree-gal-name').textContent).toBe('Neve');
    expect(card().querySelector('.tree-gal-species').textContent).toBe(SPECIES.neve.scientific);
    expect(card().querySelector('.tree-gal-line').textContent).toBe('Fungi › Dikarya › Club fungi › Mushrooms and jelly fungi');
    const facts = [...card().querySelectorAll('.tree-facts li')];
    expect(facts.map((li) => li.textContent)).toEqual(SPECIES.neve.facts.map((f) => f.replaceAll('*', '')));
    // Science names in a fact are in italics.
    expect(card().querySelector('.tree-facts i')).not.toBeNull();
    expect(card().querySelector('button')).toBeNull();
    gal('ruby').click();
    expect(card().querySelector('.tree-gal-name').textContent).toBe('Ruby');
    expect(gal('neve').getAttribute('aria-pressed')).toBe('false');
    gal('ruby').click();
    expect(card().hidden).toBe(true);
    expect(gal('ruby').getAttribute('aria-pressed')).toBe('false');
  });

  it('closes the gal card when you go to another branch', async () => {
    await open('#smuts');
    gal('olive').click();
    document.querySelector('.tree-step').click();
    expect(card().hidden).toBe(true);
  });

  it('has Back to home only at the top, and Back up a branch everywhere else', async () => {
    const home = () => document.querySelector('.tree-home');
    const back = () => document.querySelector('.tree-back');
    await open();
    expect(home().hidden).toBe(false);
    expect(home().getAttribute('href')).toBe('./index.html');
    expect(back().hidden).toBe(true);
    branch('dikarya').click();
    branch('club').click();
    expect(home().hidden).toBe(true);
    expect(back().hidden).toBe(false);
    back().click();
    expect(trail()).toEqual(['Fungi', 'Dikarya']);
    expect(document.querySelector('.tree-view > div').classList).toContain('back');
    back().click();
    expect(home().hidden).toBe(false);
    expect(back().hidden).toBe(true);
  });

  it('starts at the top for a link to a gal or an unknown branch', async () => {
    await open('#neve');
    expect(trail()).toEqual(['Fungi']);
    await open('#nope');
    expect(trail()).toEqual(['Fungi']);
  });
});

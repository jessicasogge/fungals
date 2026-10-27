// @vitest-environment jsdom
// The family tree page: one branch at a time. Tap a branch to go in, a step
// in the trail to go back up, and a gal to see her branches and cousins.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SPECIES } from '../public/game/config.js';

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
    expect(branch('dikarya').querySelector('.tree-count').textContent).toBe('14 gals ›');
    expect(branch('dikarya').querySelectorAll('.tree-faces .gal-icon')).toHaveLength(14);
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

  it('opens a gal card with her branches and her closest cousins, and closes it', async () => {
    await open('#mushrooms');
    expect(card().hidden).toBe(true);
    gal('neve').click();
    expect(card().hidden).toBe(false);
    expect(gal('neve').getAttribute('aria-pressed')).toBe('true');
    expect(card().querySelector('.tree-gal-name').textContent).toBe('Neve');
    expect(card().querySelector('.tree-gal-species').textContent).toBe(SPECIES.neve.scientific);
    expect(card().querySelector('.tree-gal-line').textContent).toBe('Fungi › Dikarya › Club fungi › Mushrooms and jelly fungi');
    expect(card().querySelector('.tree-cousins').textContent).toBe("Neve's closest cousins here: Velma and Ruby.");
    card().querySelector('.tree-close').click();
    expect(card().hidden).toBe(true);
    expect(gal('neve').getAttribute('aria-pressed')).toBe('false');
  });

  it('names the nearest cousins for a gal alone on her branch, and none for Bea', async () => {
    await open('#flask');
    gal('rosie').click();
    expect(card().querySelector('.tree-cousins').textContent)
      .toBe('Rosie is the only one on her little branch. Her nearest cousins are Fumi, Miri, Penelope and Trixie.');
    await open('#chytrids');
    gal('bea').click();
    expect(card().querySelector('.tree-cousins').textContent)
      .toBe('Bea is the only one on her branch here. Every other gal is a distant cousin.');
  });

  it('closes the gal card when you go to another branch', async () => {
    await open('#smuts');
    gal('olive').click();
    document.querySelector('.tree-step').click();
    expect(card().hidden).toBe(true);
  });

  it('starts at the top for a link to a gal or an unknown branch', async () => {
    await open('#neve');
    expect(trail()).toEqual(['Fungi']);
    await open('#nope');
    expect(trail()).toEqual(['Fungi']);
  });
});

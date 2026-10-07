// Checks the things every page shares: the FunGals tab icon (not the
// browser's generic globe) and Jess's signature at the foot.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const file = (name) => new URL(`../public/${name}`, import.meta.url);
const PAGES = ['index.html', 'pal-picker.html', 'petri-dish.html', 'whos-that-gal.html'];

describe('tab icon', () => {
  it.each(PAGES)('%s links the icon, with a PNG for browsers without SVG icons', (page) => {
    const html = readFileSync(file(page), 'utf8');
    expect(html).toContain('<link rel="icon" href="./favicon.svg" type="image/svg+xml" />');
    expect(html).toContain('<link rel="icon" href="./favicon-32.png" type="image/png" sizes="32x32" />');
  });

  it('has both icon files', () => {
    expect(existsSync(file('favicon.svg'))).toBe(true);
    expect(existsSync(file('favicon-32.png'))).toBe(true);
  });
});

describe('signature', () => {
  it.each(PAGES)('%s is signed at the foot', (page) => {
    const html = readFileSync(file(page), 'utf8');
    expect(html).toContain('<footer class="signature">jsogge 2026</footer>');
  });
});

describe('the home page title', () => {
  const html = readFileSync(file('index.html'), 'utf8');
  const css = readFileSync(file('styles.css'), 'utf8');

  it('says what the game is under its name', () => {
    expect(html).toContain('<h1 class="logo">FunGals</h1>');
    expect(html).toContain('<p class="tagline">Grow your colony. Dodge antifungals.</p>');
  });

  it("has every font file the stylesheet uses, each with its license", () => {
    const fonts = [...css.matchAll(/url\(\.\/(fonts\/[^)]+\.woff2)\)/g)].map((m) => m[1]);
    expect(fonts.length).toBeGreaterThan(0);
    for (const font of fonts) expect(existsSync(file(font)), font).toBe(true);
    expect(existsSync(file('fonts/Fredoka-OFL.txt'))).toBe(true);
    expect(existsSync(file('fonts/Nunito-OFL.txt'))).toBe(true);
  });

  it('preloads the title font, so the name shows up in it quickly', () => {
    const [, preloaded] = html.match(/<link rel="preload" href="\.\/([^"]+)" as="font"/);
    expect(css).toContain(`url(./${preloaded})`);
  });
});

describe('search engines and shared links', () => {
  const SITE = 'https://jessicasogge.github.io/fungals/';
  const meta = (html, attr, name) => html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];

  it('names the game and what it is in the home page title', () => {
    expect(readFileSync(file('index.html'), 'utf8')).toContain('<title>FunGals: A Mycology Game</title>');
  });

  it.each(PAGES)('%s has a description short enough for a search result', (page) => {
    const description = meta(readFileSync(file(page), 'utf8'), 'name', 'description');
    expect(description).toBeTruthy();
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it.each(PAGES)('%s says where it lives, for search engines and shared links', (page) => {
    const html = readFileSync(file(page), 'utf8');
    const address = page === 'index.html' ? SITE : SITE + page;
    expect(html).toContain(`<link rel="canonical" href="${address}" />`);
    expect(meta(html, 'property', 'og:url')).toBe(address);
  });

  // (No preview picture yet: when there is one, add og:image and switch the
  // card to summary_large_image, as PetriPals does.)
  it.each(PAGES)('%s has a title and description when its link is shared', (page) => {
    const html = readFileSync(file(page), 'utf8');
    expect(meta(html, 'property', 'og:title')).toBeTruthy();
    expect(meta(html, 'property', 'og:description')).toBe(meta(html, 'name', 'description'));
    expect(meta(html, 'name', 'twitter:card')).toBe('summary');
  });

  it('lists real pages in the sitemap', () => {
    const sitemap = readFileSync(file('sitemap.xml'), 'utf8');
    const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(pages).toContain(SITE);
    for (const address of pages) {
      expect(address.startsWith(SITE)).toBe(true);
      expect(existsSync(file(address.slice(SITE.length) || 'index.html')), address).toBe(true);
    }
  });
});

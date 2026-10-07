# FunGals 🍄

A cute mycology game for the browser, and the sister game to [PetriPals](https://github.com/jessicasogge/petripals). Pick a fungal pal and eat nutrients to grow your colony, but steer clear of the antifungal disks and their zones of inhibition.

**[▶ Play FunGals](https://jessicasogge.github.io/fungals/)**: works on computers, phones and tablets.

## How to play

1. **Pick a pal.** Each one is a real fungus, drawn as a cartoon.
2. **Swim around the dish.** Use the arrow keys, or on a touch screen, drag your pal like a trackpad: touch anywhere on the dish and slide your finger, and she moves the same way.
3. **Eat nutrients to bud.** Every cell that eats a nutrient buds: a little daughter cell swells out of her side and grows to full size. Daughters stick together in clusters, the way budding yeast does on a plate.
4. **Don't touch the antifungals.** Touching a disk, or the clear zone of inhibition around it, ends the game. The zones start small and spread outward over the first few seconds, so grab the nutrients near the disks early.

There are five levels. Each one adds another antifungal disk and doubles the colony you need to grow, from 4 cells up to 64.

### Who’s That Gal?

Tap **Who’s That Gal?** on the home page for a quiz on the pals' fun facts, like PetriPals' Who’s That Pal?. You get one fact with "this gal" in place of her name: tap the pal it's about. A wrong guess greys that pal out so you can try again, and the right one puts her name back in and shows her species. There's no score, so it's just for learning. The quiz skips facts that fit any yeast (like having a nucleus); the ones it uses are listed in `public/game/quiz-facts.js`.

## The pals

| Pal | Species | Looks |
|---|---|---|
| **Sasha** | *Saccharomyces cerevisiae* | Wheat-colored oval yeast with a bud and two bud scars |
| **Candi** | *Candida albicans* | Creamy white oval yeast with a bud growing from her side |

## The real science

- **Budding:** yeasts don't split in two like bacteria do. A small bud swells out of the mother cell and pinches off, which is why each daughter starts small in the dish and grows. Every bud leaves a ring-shaped scar on the mother, like the two on Sasha's picture.
- **Candi buds too**, but *Candida albicans* can also switch from budding yeast to hyphae, long thread-like cells. In the lab, sprouting germ tubes (the start of a hypha) in serum is a classic test for her.
- **The antifungal disks** work like the Kirby-Bauer disk test for bacteria. *Candida* has a standard disk test (CLSI M44), so Candi's zones are ballpark sizes for a susceptible strain. *Saccharomyces* has no standard disk sizes, so Sasha's are estimates from how well each drug works on her. Fluconazole only weakly holds *Saccharomyces* back, so her fluconazole zone is small.
- **The disk codes** are the standard ones: FLC (fluconazole), VOR (voriconazole), CAS (caspofungin), MCF (micafungin), AMB (amphotericin B) and NY (nystatin).
- **The zones spread** because the drug diffuses outward from the disk into the agar: fast at first, then more slowly. On a real plate this takes hours of incubation; the game speeds it up to a few seconds.

## Coming next

- **Molds that grow hyphae**, starting with *Penicillium* (Fleming's mold) and *Aspergillus niger*. Instead of budding, you steer a growing hyphal tip that leaves a thread behind it and branches as it eats.
- **Candi switching to hyphae**, her signature trick.
- More pals, like *Rhizopus* (bread mold) and *Trichophyton* (ringworm, which grows in rings).

## Running it locally

The game is plain HTML, CSS and JavaScript in [`public/`](public/), with no build step. To run it with the included dev server:

```sh
npm install
npm run dev
```

Then open http://localhost:3000.

## Tests

```sh
npm test                # run the tests
npm run test:coverage   # run them and check how much of the game they cover
```

The tests use [Vitest](https://vitest.dev/). Most of the game logic runs in [jsdom](https://github.com/jsdom/jsdom), a simulated browser page. The coverage check fails if the tests leave game code untested (the thresholds are in [`vitest.config.js`](vitest.config.js)), and the deploy runs it, so untested code doesn't ship.

## Project layout

FunGals started as a copy of the PetriPals engine (steering, nutrients, disks and zones, the loading card and the win spores), with the bacteria swapped out for fungi.

| Path | What's there |
|---|---|
| `public/index.html` | Home page |
| `public/pal-picker.html` | Pick a pal |
| `public/petri-dish.html` | The game |
| `public/whos-that-gal.html` | Who’s That Gal?, a quiz: which pal is this fact about? |
| `public/game/` | Game code: the game loop (`game.js`), a colony eating and budding (`colony.js`), how yeast cells bud and cluster (`yeast.js`, with the cluster math in `attach.js`), steering (`keyboard.js`, `touch.js`), antifungal disks and zones (`antifungal.js`), nutrients, physics, settings and fun facts (`config.js`), the fun-fact pop-up (`facts.js`, with italics for scientific names from `italics.js`) the win spores (`spores.js`), and Who’s That Gal? (`whos-that-gal.js`, with the facts' "this gal" swap in `guess.js` and the facts it asks about in `quiz-facts.js`) |
| `public/game/pals.js` | Every pal's name and drawing, in one place. To add a pal, see the notes at the top. |
| `test/` | Tests |
| `src/index.ts` | Small Express server for local development |

## Deployment

Every push to `main` runs the tests and the coverage check and, if they pass, publishes `public/` to GitHub Pages (see [`.github/workflows/pages.yml`](.github/workflows/pages.yml)). In the repo's **Settings → Pages**, set **Source** to **GitHub Actions** once.

## Contributing

Bug reports, ideas and fixes are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started, and please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

FunGals is released under the [MIT License](LICENSE). The win spores use [canvas-confetti](https://github.com/catdad/canvas-confetti), which is ISC licensed ([`public/game/vendor/confetti.LICENSE`](public/game/vendor/confetti.LICENSE)). The home page uses the [Fredoka](https://github.com/hafontia/Fredoka-One) and [Nunito](https://github.com/googlefonts/nunito) fonts, under the SIL Open Font License ([`public/fonts/`](public/fonts/)).

## Credits

Made by Jessica Sogge.

# FunGals 🍄

A cute mycology game for the browser, and the sister game to [PetriPals](https://github.com/jessicasogge/petripals). Pick a fungal pal and eat nutrients to grow your colony, but steer clear of the antifungal disks and their zones of inhibition.

**[▶ Play FunGals](https://jessicasogge.github.io/fungals/)**: works on computers, phones and tablets.

## How to play

1. **Pick a pal.** Each one is a real fungus, drawn as a cartoon.
2. **Swim around the dish.** Use the arrow keys, or on a touch screen, drag your pal like a trackpad: touch anywhere on the dish and slide your finger, and she moves the same way.
3. **Eat nutrients to bud.** Every cell that eats a nutrient buds: a little daughter cell swells out of her side and grows to full size. Daughters stick together in clusters, the way budding yeast does on a plate.
   **Fumi grows threads instead.** She's a mold, so you steer her growing tip: she never stops growing, and turns toward the arrow keys or the way your finger slides. Walls form along her threads, and each walled compartment is a cell. Eating a nutrient sprouts a branch that grows and eats on its own.
4. **Don't touch the antifungals.** Touching a disk, or the clear zone of inhibition around it, ends the game. The zones start small and spread outward over the first few seconds, so grab the nutrients near the disks early.

There are seven levels. Each one adds another antifungal disk and doubles the colony you need to grow, from 4 cells up to 256. Each pal has five antifungals, so levels 6 and 7 start over from her first drugs.

### Who’s That Gal?

Tap **Who’s That Gal?** on the home page for a quiz on the pals' fun facts, like PetriPals' Who’s That Pal?. You get one fact with "this gal" in place of her name: tap the pal it's about. A wrong guess greys that pal out so you can try again, and the right one puts her name back in and shows her species. There's no score, so it's just for learning. The quiz skips facts that fit any yeast (like having a nucleus); the ones it uses are listed in `public/game/quiz-facts.js`.

## The pals

| Pal | Species | Looks |
|---|---|---|
| **Sasha** | *Saccharomyces cerevisiae* | Wheat-colored oval yeast with a bud and two bud scars |
| **Candi** | *Candida albicans* | Sky-blue oval yeast with a bud and two bud scars |
| **Olive** | *Malassezia furfur* | Olive-green bowling pin: a broad-based bud on one end, with a collarette at the neck |
| **Fumi** | *Aspergillus fumigatus* | Smoky gray-green spore stalk: a round head with columns of spores on top, rising from a foot cell |

## The real science

- **Budding:** yeasts don't split in two like bacteria do. A small bud swells out of the mother cell and pinches off, which is why each daughter starts small in the dish and grows. Every bud leaves a ring-shaped scar on the mother, like the two on Sasha's and Candi's pictures.
- **Olive buds from one end:** *Malassezia furfur* buds again and again from the same end, on a wide base, so mother and bud make a bowling pin. Each bud leaves a collar there, the collarette, instead of scattered bud scars, and in the dish her buds always grow from the top. She's olive green for the olive oil labs pour over her plates: she can't make her own fatty acids, so she needs oil to grow.
- **Fumi is a mold:** *Aspergillus fumigatus* never buds. She grows as hyphae, threads that stretch from their tips, with cross-walls (septa) along them and branches at sharp angles, about 45°. In the dish her walled compartments count as cells, and a branch that grows into a zone stops there, the way hyphae stop at the edge of a real zone of inhibition. Her picture is her conidiophore, the stalk that makes her spores, with the straight columns of spores that tell *A. fumigatus* apart from other *Aspergillus*. *Fumigatus* means "smoky," after her gray-green colonies.
- **Candi buds too**, but *Candida albicans* can also switch from budding yeast to hyphae, long thread-like cells. In the lab, sprouting germ tubes (the start of a hypha) in serum is a classic test for her.
- **The antifungal disks** work like the Kirby-Bauer disk test for bacteria. *Candida* has a standard disk test (CLSI M44), so Candi's zones are ballpark sizes for a susceptible strain. *Saccharomyces* and *Malassezia* have no standard disk sizes, so Sasha's and Olive's are estimates from how well each drug works on them. Fluconazole only weakly holds *Saccharomyces* back, so Sasha's fluconazole zone is small. *Malassezia* is naturally resistant to echinocandins, so Olive's caspofungin disk has **no zone at all**: you can swim right up to it, but don't touch the disk itself. Molds have few standard disk sizes (CLSI M51), so Fumi's zones are estimates too. Voriconazole, the usual first choice for aspergillosis, is her first disk, and her fluconazole disk has no zone, since *Aspergillus* is naturally resistant to it.
- **The disk codes** are the standard ones: FLC (fluconazole), VOR (voriconazole), KCA (ketoconazole), ITC (itraconazole), CAS (caspofungin), MCF (micafungin), AMB (amphotericin B) and NY (nystatin).
- **The zones spread** because the drug diffuses outward from the disk into the agar: fast at first, then more slowly. On a real plate this takes hours of incubation; the game speeds it up to a few seconds.

## Coming next

- **More molds**, like *Penicillium* (Fleming's mold) and *Aspergillus niger*, using Fumi's threads.
- **Branches that steer away from each other**, the way real hyphae do (autotropism).
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
| `public/game/` | Game code: the game loop (`game.js`), a colony eating and growing (`colony.js`), how yeast cells bud and cluster (`yeast.js`, with the cluster math in `attach.js`), how a mold's threads grow, wall off and branch (`hypha.js`), steering (`keyboard.js`, `touch.js`), antifungal disks and zones (`antifungal.js`), nutrients, physics, settings and fun facts (`config.js`), the fun-fact pop-up (`facts.js`, with italics for scientific names from `italics.js`) the win spores (`spores.js`), and Who’s That Gal? (`whos-that-gal.js`, with the facts' "this gal" swap in `guess.js` and the facts it asks about in `quiz-facts.js`) |
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

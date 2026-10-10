// Every pal's drawing, in one place. The home page, the pal picker and the
// petri dish all draw the pals from here, so a change to how a pal looks
// only has to be made once.
//
// The home page shows them in its own order (HOME below), and the picker
// shuffles them.
// Each pal has:
//   id      her key, matching SPECIES in config.js and ?pal= in addresses
//   name    what she's called
//   looks   what a screen reader says after her name
//   motion  her idle animation in styles.css (bob, squish, wobble or slither)
//   frames  the part of the drawing each page shows (an SVG viewBox), so each
//           page can frame her its own way: a little room around her on the
//           home page, filling her tile on the picker, snug in the dish
//   art     the drawing itself, in a 200 x 200 space. Wrap the face in
//           <g class="face">.
//   dishArt (optional) a different drawing for the dish, framed by
//           frames.dish: a mold plays as one of her spores
//
// To add a pal: add her to the end of this list and to SPECIES in config.js,
// and give her tile a color in styles.css (.<id> next to .sasha and the
// others).

const SVG = 'http://www.w3.org/2000/svg';

// A cute face: eyes with a glint, rosy cheeks and a smile, centered on
// (x, y), in the pal's `dark` color.
const face = (x, y, dark) => `
      <g class="face">
        <circle cx="${x - 11}" cy="${y}" r="6" fill="${dark}" />
        <circle cx="${x + 11}" cy="${y}" r="6" fill="${dark}" />
        <circle cx="${x - 9}" cy="${y - 2}" r="2" fill="white" />
        <circle cx="${x + 13}" cy="${y - 2}" r="2" fill="white" />
        <ellipse cx="${x - 21}" cy="${y + 12}" rx="6" ry="3.5" fill="#f9a8d4" opacity="0.8" />
        <ellipse cx="${x + 21}" cy="${y + 12}" rx="6" ry="3.5" fill="#f9a8d4" opacity="0.8" />
        <path d="M${x - 6} ${y + 12} Q${x} ${y + 18} ${x + 6} ${y + 12}" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round" />
      </g>`;

export const PALS = [
  // Sasha: Saccharomyces cerevisiae, a wheat-colored oval yeast cell with a
  // bud growing out of her side and two bud scars from daughters she's had
  {
    id: 'sasha',
    name: 'Sasha',
    looks: 'a wheat-colored oval Saccharomyces yeast cell with a little bud growing from her side',
    motion: 'squish',
    frames: { home: '28 20 160 160', picker: '36 28 144 144', dish: '40 32 136 136' },
    art: `
      <!-- the bud, swelling out of her upper right -->
      <circle cx="150" cy="62" r="20" fill="#f3dfbf" stroke="#8a5a2b" stroke-width="4" />
      <circle cx="144" cy="55" r="4" fill="#fbf3e4" />
      <!-- the mother cell -->
      <ellipse cx="100" cy="112" rx="52" ry="44" fill="#f3dfbf" stroke="#8a5a2b" stroke-width="4" />
      <ellipse cx="80" cy="86" rx="9" ry="5" fill="#fbf3e4" transform="rotate(-25 80 86)" />
      <!-- bud scars, one for each daughter she's had -->
      <ellipse cx="62" cy="132" rx="6" ry="4" fill="none" stroke="#b08250" stroke-width="2.5" />
      <ellipse cx="138" cy="132" rx="6" ry="4" fill="none" stroke="#b08250" stroke-width="2.5" />
      ${face(100, 112, '#5b3a1e')}
    `,
  },
  // Candi: Candida albicans, a soft sky-blue oval yeast cell with a deeper
  // blue outline, a bud growing out of her upper left and two bud scars
  {
    id: 'candi',
    name: 'Candi',
    looks: 'a sky-blue oval Candida albicans yeast cell with a little bud growing from her side',
    motion: 'bob',
    frames: { home: '12 20 160 160', picker: '20 28 144 144', dish: '24 32 136 136' },
    art: `
      <!-- the bud, swelling out of her upper left: Sasha's bud, mirrored, so
           both attach the same way -->
      <circle cx="50" cy="62" r="20" fill="#d6e8ff" stroke="#2563eb" stroke-width="4" />
      <circle cx="44" cy="55" r="4" fill="#ffffff" />
      <!-- the mother cell, the same size as Sasha's -->
      <ellipse cx="100" cy="112" rx="52" ry="44" fill="#d6e8ff" stroke="#2563eb" stroke-width="4" />
      <ellipse cx="80" cy="86" rx="9" ry="5" fill="#ffffff" transform="rotate(-25 80 86)" />
      <!-- bud scars, one for each daughter she's had, like Sasha's -->
      <ellipse cx="62" cy="132" rx="6" ry="4" fill="none" stroke="#93c5fd" stroke-width="2.5" />
      <ellipse cx="138" cy="132" rx="6" ry="4" fill="none" stroke="#93c5fd" stroke-width="2.5" />
      ${face(100, 112, '#1e3a8a')}
    `,
  },
  // Olive: Malassezia furfur, an olive-green yeast shaped like a bowling pin:
  // a broad-based bud on top of her mother cell, with a lighter collarette
  // across the neck where her buds pinch off
  {
    id: 'olive',
    name: 'Olive',
    looks: 'an olive-green Malassezia furfur yeast cell shaped like a bowling pin, budding from one end',
    motion: 'wobble',
    frames: { home: '16 22 168 168', picker: '22 28 156 156', dish: '26 32 148 148' },
    art: `
      <!-- one bowling-pin outline: both cells' outlines first, then both
           fills on top, so the outline runs smoothly round the neck -->
      <ellipse cx="100" cy="72" rx="34" ry="38" fill="#6b7a2a" stroke="#6b7a2a" stroke-width="4" />
      <ellipse cx="100" cy="134" rx="49" ry="44" fill="#6b7a2a" stroke="#6b7a2a" stroke-width="4" />
      <!-- the bud, growing on a wide base from the top of her -->
      <ellipse cx="100" cy="72" rx="32" ry="36" fill="#d9e6a6" />
      <!-- the mother cell -->
      <ellipse cx="100" cy="134" rx="47" ry="42" fill="#d9e6a6" />
      <!-- the collarette, the collar left where each bud pinches off -->
      <path d="M71 101 Q100 112 129 101" stroke="#a3b553" stroke-width="4" fill="none" stroke-linecap="round" />
      <circle cx="88" cy="56" r="5" fill="#f7faea" />
      <ellipse cx="78" cy="118" rx="8" ry="4.5" fill="#f7faea" transform="rotate(-30 78 118)" />
      ${face(100, 140, '#3a4410')}
    `,
  },
  // Fumi: Aspergillus fumigatus, a smoky green mold. Her picture is her
  // conidiophore, the stalk that makes her spores: a round head (the vesicle)
  // with chains of spores standing up from its top in columns. In the dish
  // she plays as one of those spores (dishArt), a little round, slightly
  // spiky ball, and plants colonies (see mold.js).
  {
    id: 'fumi',
    name: 'Fumi',
    looks: 'a smoky green Aspergillus fumigatus mold: a round head on a stalk, topped with columns of spores',
    motion: 'bob',
    frames: { home: '20 32 160 160', picker: '29 44 142 142', dish: '50 50 100 100' },
    art: `
      <!-- the stalk (stipe) -->
      <rect x="93" y="150" width="14" height="36" rx="6" fill="#dcebe5" stroke="#3f7a6c" stroke-width="4" />
      <!-- chains of spores on little flasks (phialides), all pointing up -->
      <ellipse cx="74" cy="97" rx="4.5" ry="7" fill="#bcd6cc" stroke="#3f7a6c" stroke-width="2.5" />
      <circle cx="74" cy="85" r="7" fill="#7fa89b" stroke="#3f7a6c" stroke-width="2.5" />
      <circle cx="74" cy="72" r="7" fill="#7fa89b" stroke="#3f7a6c" stroke-width="2.5" />
      <ellipse cx="87" cy="92" rx="4.5" ry="7" fill="#bcd6cc" stroke="#3f7a6c" stroke-width="2.5" />
      <circle cx="87" cy="80" r="7" fill="#7fa89b" stroke="#3f7a6c" stroke-width="2.5" />
      <circle cx="87" cy="67" r="7" fill="#7fa89b" stroke="#3f7a6c" stroke-width="2.5" />
      <circle cx="87" cy="54" r="7" fill="#7fa89b" stroke="#3f7a6c" stroke-width="2.5" />
      <ellipse cx="100" cy="90" rx="4.5" ry="7" fill="#bcd6cc" stroke="#3f7a6c" stroke-width="2.5" />
      <circle cx="100" cy="78" r="7" fill="#7fa89b" stroke="#3f7a6c" stroke-width="2.5" />
      <circle cx="100" cy="65" r="7" fill="#7fa89b" stroke="#3f7a6c" stroke-width="2.5" />
      <circle cx="100" cy="52" r="7" fill="#7fa89b" stroke="#3f7a6c" stroke-width="2.5" />
      <ellipse cx="113" cy="92" rx="4.5" ry="7" fill="#bcd6cc" stroke="#3f7a6c" stroke-width="2.5" />
      <circle cx="113" cy="80" r="7" fill="#7fa89b" stroke="#3f7a6c" stroke-width="2.5" />
      <circle cx="113" cy="67" r="7" fill="#7fa89b" stroke="#3f7a6c" stroke-width="2.5" />
      <circle cx="113" cy="54" r="7" fill="#7fa89b" stroke="#3f7a6c" stroke-width="2.5" />
      <ellipse cx="126" cy="97" rx="4.5" ry="7" fill="#bcd6cc" stroke="#3f7a6c" stroke-width="2.5" />
      <circle cx="126" cy="85" r="7" fill="#7fa89b" stroke="#3f7a6c" stroke-width="2.5" />
      <circle cx="126" cy="72" r="7" fill="#7fa89b" stroke="#3f7a6c" stroke-width="2.5" />
      <!-- the swollen head (vesicle) -->
      <ellipse cx="100" cy="128" rx="42" ry="34" fill="#dcebe5" stroke="#3f7a6c" stroke-width="4" />
      <ellipse cx="82" cy="112" rx="8" ry="4.5" fill="#f4faf7" transform="rotate(-25 82 112)" />
      ${face(100, 132, '#1f4d43')}
    `,
    dishArt: `
      <!-- a rough, slightly spiky spore (conidium) -->
      <g fill="#5b8c80"><circle cx="142.0" cy="100.0" r="4.5" /><circle cx="137.8" cy="118.2" r="4.5" /><circle cx="126.2" cy="132.8" r="4.5" /><circle cx="109.3" cy="140.9" r="4.5" /><circle cx="90.7" cy="140.9" r="4.5" /><circle cx="73.8" cy="132.8" r="4.5" /><circle cx="62.2" cy="118.2" r="4.5" /><circle cx="58.0" cy="100.0" r="4.5" /><circle cx="62.2" cy="81.8" r="4.5" /><circle cx="73.8" cy="67.2" r="4.5" /><circle cx="90.7" cy="59.1" r="4.5" /><circle cx="109.3" cy="59.1" r="4.5" /><circle cx="126.2" cy="67.2" r="4.5" /><circle cx="137.8" cy="81.8" r="4.5" /></g>
      <circle cx="100" cy="100" r="42" fill="#dcebe5" stroke="#3f7a6c" stroke-width="4" />
      <ellipse cx="82" cy="80" rx="9" ry="5" fill="#f4faf7" transform="rotate(-25 82 80)" />
      ${face(100, 104, '#1f4d43')}
    `,
  },
  // Penelope: Penicillium rubens, Fleming's penicillin mold, drawn as her
  // spore stalk: a butter-yellow paintbrush (Penicillium means "little
  // paintbrush"), with a wide fan of blue spore chains for bristles. In the
  // dish she plays as one of her spores (dishArt) and plants colonies, just
  // like Fumi (see mold.js).
  {
    id: 'penelope',
    name: 'Penelope',
    looks: 'a butter-yellow Penicillium rubens mold shaped like a paintbrush, with blue chains of spores for bristles',
    motion: 'bob',
    frames: { home: '8 12 184 184', picker: '12 16 176 176', dish: '50 50 100 100' },
    art: `
      <!-- the handle (stipe), the bristles (chains of spores on short
           branches), and the band where they meet, with her face -->
      <path d="M90 144 L93 188 Q100 195 107 188 L110 144 Z" fill="#f8eaa8" stroke="#33496e" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="55.0" cy="80.2" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="49.2" cy="73.1" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="43.4" cy="65.9" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="37.7" cy="58.8" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="31.9" cy="51.6" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="61.8" cy="75.6" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="57.3" cy="67.6" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="52.9" cy="59.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="48.4" cy="51.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="44.0" cy="43.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="71.0" cy="75.8" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="67.1" cy="67.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="63.2" cy="59.2" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="59.3" cy="50.8" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="55.4" cy="42.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="51.6" cy="34.2" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="78.7" cy="73.0" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="76.3" cy="64.2" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="73.9" cy="55.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="71.5" cy="46.4" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="69.2" cy="37.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="66.8" cy="28.6" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="87.3" cy="73.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="85.4" cy="64.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="83.5" cy="55.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="81.6" cy="46.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="79.7" cy="37.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="77.7" cy="28.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="95.4" cy="72.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="95.1" cy="63.1" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="94.8" cy="53.9" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="94.5" cy="44.7" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="94.1" cy="35.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="93.8" cy="26.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="104.6" cy="72.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="104.9" cy="63.1" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="105.2" cy="53.9" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="105.5" cy="44.7" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="105.9" cy="35.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="106.2" cy="26.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="112.7" cy="73.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="114.6" cy="64.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="116.5" cy="55.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="118.4" cy="46.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="120.3" cy="37.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="122.3" cy="28.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="121.3" cy="73.0" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="123.7" cy="64.2" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="126.1" cy="55.3" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="128.5" cy="46.4" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="130.8" cy="37.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="133.2" cy="28.6" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="129.0" cy="75.8" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="132.9" cy="67.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="136.8" cy="59.2" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="140.7" cy="50.8" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="144.6" cy="42.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="148.4" cy="34.2" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="138.2" cy="75.6" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="142.7" cy="67.6" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="147.1" cy="59.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="151.6" cy="51.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="156.0" cy="43.5" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="145.0" cy="80.2" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="150.8" cy="73.1" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="156.6" cy="65.9" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="162.3" cy="58.8" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <circle cx="168.1" cy="51.6" r="4.6" fill="#6b8fc4" stroke="#33496e" stroke-width="1.8"/>
      <ellipse cx="60.7" cy="87.2" rx="2.6" ry="4.8" fill="#b9cbe6" stroke="#33496e" stroke-width="1.8" transform="rotate(-39 60.7 87.2)"/>
      <ellipse cx="66.2" cy="83.5" rx="2.6" ry="4.8" fill="#b9cbe6" stroke="#33496e" stroke-width="1.8" transform="rotate(-29 66.2 83.5)"/>
      <ellipse cx="74.8" cy="84.0" rx="2.6" ry="4.8" fill="#b9cbe6" stroke="#33496e" stroke-width="1.8" transform="rotate(-25 74.8 84.0)"/>
      <ellipse cx="81.0" cy="81.7" rx="2.6" ry="4.8" fill="#b9cbe6" stroke="#33496e" stroke-width="1.8" transform="rotate(-15 81.0 81.7)"/>
      <ellipse cx="89.2" cy="82.1" rx="2.6" ry="4.8" fill="#b9cbe6" stroke="#33496e" stroke-width="1.8" transform="rotate(-12 89.2 82.1)"/>
      <ellipse cx="95.7" cy="81.3" rx="2.6" ry="4.8" fill="#b9cbe6" stroke="#33496e" stroke-width="1.8" transform="rotate(-2 95.7 81.3)"/>
      <ellipse cx="104.3" cy="81.3" rx="2.6" ry="4.8" fill="#b9cbe6" stroke="#33496e" stroke-width="1.8" transform="rotate(2 104.3 81.3)"/>
      <ellipse cx="110.8" cy="82.1" rx="2.6" ry="4.8" fill="#b9cbe6" stroke="#33496e" stroke-width="1.8" transform="rotate(12 110.8 82.1)"/>
      <ellipse cx="119.0" cy="81.7" rx="2.6" ry="4.8" fill="#b9cbe6" stroke="#33496e" stroke-width="1.8" transform="rotate(15 119.0 81.7)"/>
      <ellipse cx="125.2" cy="84.0" rx="2.6" ry="4.8" fill="#b9cbe6" stroke="#33496e" stroke-width="1.8" transform="rotate(25 125.2 84.0)"/>
      <ellipse cx="133.8" cy="83.5" rx="2.6" ry="4.8" fill="#b9cbe6" stroke="#33496e" stroke-width="1.8" transform="rotate(29 133.8 83.5)"/>
      <ellipse cx="139.3" cy="87.2" rx="2.6" ry="4.8" fill="#b9cbe6" stroke="#33496e" stroke-width="1.8" transform="rotate(39 139.3 87.2)"/>
      <rect x="71.5" y="84" width="9" height="20" rx="4.5" fill="#f8eaa8" stroke="#33496e" stroke-width="2.6" transform="rotate(-34 76.0 104)"/>
      <rect x="81.1" y="84" width="9" height="20" rx="4.5" fill="#f8eaa8" stroke="#33496e" stroke-width="2.6" transform="rotate(-20 85.6 104)"/>
      <rect x="90.7" y="84" width="9" height="20" rx="4.5" fill="#f8eaa8" stroke="#33496e" stroke-width="2.6" transform="rotate(-7 95.2 104)"/>
      <rect x="100.3" y="84" width="9" height="20" rx="4.5" fill="#f8eaa8" stroke="#33496e" stroke-width="2.6" transform="rotate(7 104.8 104)"/>
      <rect x="109.9" y="84" width="9" height="20" rx="4.5" fill="#f8eaa8" stroke="#33496e" stroke-width="2.6" transform="rotate(20 114.4 104)"/>
      <rect x="119.5" y="84" width="9" height="20" rx="4.5" fill="#f8eaa8" stroke="#33496e" stroke-width="2.6" transform="rotate(34 124.0 104)"/>
      <rect x="66" y="100" width="68" height="48" rx="11" fill="#f8eaa8" stroke="#33496e" stroke-width="4"/>
      <path d="M70 109 H130" stroke="#e3cf72" stroke-width="3" stroke-linecap="round"/>
      <rect x="93" y="144" width="14" height="6" fill="#f8eaa8"/>
      <ellipse cx="80" cy="116" rx="7" ry="3.5" fill="#fffbe6" transform="rotate(-15 80 116)"/>
      ${face(100, 123, '#26385a')}
    `,
    dishArt: `
      <!-- a smooth, round blue spore (conidium) -->
      <circle cx="100" cy="100" r="42" fill="#b9cbe6" stroke="#33496e" stroke-width="4" />
      <ellipse cx="82" cy="80" rx="9" ry="5" fill="#eef3fb" transform="rotate(-25 82 80)" />
      ${face(100, 104, '#26385a')}
    `,
  },
];

// The home page's row, in its own order: the yeasts, with Olive in the
// middle, then the molds, Fumi and Penelope.
const HOME = ['sasha', 'olive', 'candi', 'fumi', 'penelope'];
export const HOME_PALS = HOME.map((id) => PALS.find((pal) => pal.id === id));

// How many pals fit on one page of the picker: four across, two down.
export const PAGE_SIZE = 8;

// `pals` split into the picker's pages, in order, PAGE_SIZE to a page (the
// last page has whoever is left over).
export function pickerPages(pals = PALS, size = PAGE_SIZE) {
  const pages = [];
  for (let i = 0; i < pals.length; i += size) pages.push(pals.slice(i, i + size));
  return pages;
}

// A copy of `pals` in a random order (a Fisher-Yates shuffle, so every order
// is equally likely). The picker uses it so no pal is always first.
export function inRandomOrder(pals, random = Math.random) {
  const order = [...pals];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function palById(id) {
  return PALS.find((pal) => pal.id === id);
}

// Her drawing as an <svg>, framed for `page` ('home', 'picker' or 'dish').
function drawing(pal, page) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', pal.frames[page]);
  svg.innerHTML = page === 'dish' && pal.dishArt ? pal.dishArt : pal.art;
  // Anything drawn with SVG's own <animate> moves on the home page and in
  // the dish, but stays still on the picker, and for anyone who has asked for
  // less motion (CSS can't pause <animate>).
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (page === 'picker' || reduced) {
    for (const wiggle of svg.querySelectorAll('animate')) wiggle.remove();
  }
  return svg;
}

// For the home page's row of pals.
export function homePal(pal) {
  const svg = drawing(pal, 'home');
  svg.setAttribute('class', `pal ${pal.motion}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${pal.name}, ${pal.looks}`);
  return svg;
}

// Her picture on a colored tile, for the picker. The name
// next to it says who she is, so the picture is hidden from screen readers.
export function palTile(pal) {
  const tile = document.createElement('div');
  tile.className = `pal-icon ${pal.id}`;
  const svg = drawing(pal, 'picker');
  svg.setAttribute('aria-hidden', 'true');
  tile.append(svg);
  return tile;
}

// For the petri dish, hidden until the game picks her (main.js).
export function dishPal(pal) {
  const svg = drawing(pal, 'dish');
  svg.setAttribute('class', `dish-pal ${pal.motion}`);
  svg.dataset.pal = pal.id;
  svg.dataset.name = pal.name;
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${pal.name}, ${pal.looks}`);
  svg.setAttribute('hidden', '');
  return svg;
}

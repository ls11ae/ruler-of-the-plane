# Credits

## Original game

Ruler of the Plane (Unity, TU Eindhoven, 2017–2020), [github.com/kbuchin/ruler](https://github.com/kbuchin/ruler):

- Project lead: Kevin Buchin
- Programming: Sander Beekhuis, Kevin Buchin, Thom Hurks, Stijn Slot
- Art: Willem Sonke, Thom Castermans (not used in this edition)
- Dots & Polygons: Jolan Rensen, GitHub user leovsch
- Art gallery levels (2020 set): Toon van Benthem, Kevin Buchin, Irina Kostitsyna, Stijn Slot, from
  "Designing Art Galleries" (SoCG 2020 Media Exposition, LIPIcs, 80:1–80:5)

The level files in `legacy/levels/` and the texts in `legacy/ingameText.md` come from that project.

## Art

All art is by Kenney ([www.kenney.nl](https://www.kenney.nl)) and in the public domain (CC0 1.0); credit
is not required but given gladly. Each folder contains the pack's `License.txt`. The repository holds
these subsets:

- Cartography Pack: `assets/kenney/cartography-pack/` (all icons in the 128 px "Retina" size, two
  parchment textures)
- Scribble Dungeons 1.0: `assets/kenney/scribble-dungeons/` (128 px tiles, characters, items)
- Animal Pack Remastered: `assets/kenney/animal-pack-remastered/round-outline/` (style "Round (outline)")

Files used by the app: add a row in the section of the game that uses the file (or "Shared") in the same
pull request that starts using it.

### Shared

| File                                                          | Source           | Author                          | Licence | Used for                                                            | Changes     |
| ------------------------------------------------------------- | ---------------- | ------------------------------- | ------- | ------------------------------------------------------------------- | ----------- |
| `assets/kenney/cartography-pack/textures/parchmentFolded.png` | Cartography Pack | Kenney                          | CC0 1.0 | Background of the start map, the attract screen and the page        | none        |
| `assets/kenney/cartography-pack/compass.png`                  | Cartography Pack | Kenney                          | CC0 1.0 | Compass rose on the start map and the attract screen                | none        |
| `assets/kenney/cartography-pack/towerWatch.png`               | Cartography Pack | Kenney                          | CC0 1.0 | Start map: "Licht ins Verlies"                                      | none        |
| `assets/kenney/cartography-pack/castle.png`                   | Cartography Pack | Kenney                          | CC0 1.0 | Start map: "Erobere das Land"                                       | none        |
| `assets/kenney/cartography-pack/fence.png`                    | Cartography Pack | Kenney                          | CC0 1.0 | Start map: "Gassi gehen"                                            | none        |
| `assets/kenney/cartography-pack/stable.png`                   | Cartography Pack | Kenney                          | CC0 1.0 | Start map: "Rasenmähen"                                             | none        |
| `assets/kenney/cartography-pack/textureBricks.png`            | Cartography Pack | Kenney                          | CC0 1.0 | Start map: fields at "Rasenmähen"                                   | none        |
| `assets/kenney/cartography-pack/mill.png`                     | Cartography Pack | Kenney                          | CC0 1.0 | Start map: "Rasenmähen"                                             | none        |
| `assets/kenney/cartography-pack/houses.png`                   | Cartography Pack | Kenney                          | CC0 1.0 | Start map: "Straßenbau"                                             | none        |
| `assets/kenney/cartography-pack/house.png`                    | Cartography Pack | Kenney                          | CC0 1.0 | Start map: "Straßenbau"                                             | none        |
| `assets/kenney/cartography-pack/houseSmall.png`               | Cartography Pack | Kenney                          | CC0 1.0 | Start map: "Straßenbau"                                             | none        |
| `assets/kenney/cartography-pack/watchtower.png`               | Cartography Pack | Kenney                          | CC0 1.0 | Start map: "Straßenbau"                                             | none        |
| `assets/kenney/cartography-pack/ruins.png`                    | Cartography Pack | Kenney                          | CC0 1.0 | Start map: "Alte Ruinen"                                            | none        |
| `assets/kenney/cartography-pack/ship.png`                     | Cartography Pack | Kenney                          | CC0 1.0 | Start map: "Rundreise"                                              | none        |
| `assets/kenney/cartography-pack/rocksMountain.png`            | Cartography Pack | Kenney                          | CC0 1.0 | Start map: decoration                                               | none        |
| `assets/kenney/cartography-pack/rocks.png`                    | Cartography Pack | Kenney                          | CC0 1.0 | Start map: decoration                                               | none        |
| `assets/kenney/cartography-pack/treePines.png`                | Cartography Pack | Kenney                          | CC0 1.0 | Start map: decoration                                               | none        |
| `assets/kenney/cartography-pack/treePine.png`                 | Cartography Pack | Kenney                          | CC0 1.0 | Start map: decoration                                               | none        |
| `assets/kenney/cartography-pack/textureWater.png`             | Cartography Pack | Kenney                          | CC0 1.0 | Start map: waves                                                    | none        |
| `public/favicon.svg`, `public/icons/*.png`                    | this repository  | Ruler of the Plane contributors | MIT     | App icon (compass rose); PNGs rendered by `scripts/render-icons.ts` | own drawing |

### Licht ins Verlies

| File | Source | Author | Licence | Used for | Changes |
| ---- | ------ | ------ | ------- | -------- | ------- |

### Erobere das Land

| File | Source | Author | Licence | Used for | Changes |
| ---- | ------ | ------ | ------- | -------- | ------- |

### Gassi gehen

| File | Source | Author | Licence | Used for | Changes |
| ---- | ------ | ------ | ------- | -------- | ------- |

### Rasenmähen

| File | Source | Author | Licence | Used for | Changes |
| ---- | ------ | ------ | ------- | -------- | ------- |

### Straßenbau

| File | Source | Author | Licence | Used for | Changes |
| ---- | ------ | ------ | ------- | -------- | ------- |

## Fonts

Both fonts are licensed under the SIL Open Font License 1.1 and used unmodified.

Both are used for the whole app (Eagle Lake for titles and place names, Patrick Hand for all other
text).

- Eagle Lake: Copyright (c) 2012, Brian J. Bonislawsky DBA Astigmatic (AOETI), Reserved Font Name
  "Eagle Lake". File `assets/fonts/EagleLake-Regular.ttf`, licence `assets/fonts/EagleLake-OFL.txt`.
- Patrick Hand: Copyright (c) 2010–2012 Patrick Wagesreiter. File `assets/fonts/PatrickHand-Regular.ttf`,
  licence `assets/fonts/PatrickHand-OFL.txt`.

## Libraries

Runtime libraries and their licences (add them when they are introduced):

| Library                                                                                                                                        | Licence                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| [React](https://react.dev) and React DOM                                                                                                       | MIT                       |
| [zustand](https://github.com/pmndrs/zustand)                                                                                                   | MIT                       |
| [robust-predicates](https://github.com/mourner/robust-predicates) (exact orientation tests; port of Jonathan Shewchuk's predicates)            | Unlicense (public domain) |
| [Workbox](https://github.com/GoogleChrome/workbox) (service worker for offline use, generated by vite-plugin-pwa)                              | MIT                       |
| [clipper2-ts](https://github.com/countertype/clipper2-ts) (TypeScript port of Angus Johnson's Clipper2: union and difference of the lit areas) | BSL-1.0                   |
| [earcut](https://github.com/mapbox/earcut) (triangulation of the dungeons)                                                                     | ISC                       |

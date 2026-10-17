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

| File                                                              | Source            | Author | Licence | Used for                                          | Changes |
| ----------------------------------------------------------------- | ----------------- | ------ | ------- | ------------------------------------------------- | ------- |
| `assets/kenney/scribble-dungeons/tiles.png`                       | Scribble Dungeons | Kenney | CC0 1.0 | Grid-paper floor (pattern clipped to the dungeon) | none    |
| `assets/kenney/scribble-dungeons/characters/yellow_character.png` | Scribble Dungeons | Kenney | CC0 1.0 | Torch token (flame drawn on top in SVG)           | none    |
| `assets/kenney/scribble-dungeons/barrels.png`                     | Scribble Dungeons | Kenney | CC0 1.0 | Prop (decoration)                                 | none    |
| `assets/kenney/scribble-dungeons/chest.png`                       | Scribble Dungeons | Kenney | CC0 1.0 | Prop (decoration)                                 | none    |
| `assets/kenney/scribble-dungeons/crate_small.png`                 | Scribble Dungeons | Kenney | CC0 1.0 | Prop (decoration)                                 | none    |
| `assets/kenney/scribble-dungeons/barrel.png`                      | Scribble Dungeons | Kenney | CC0 1.0 | Prop (decoration)                                 | none    |

### Erobere das Land

| File                                               | Source           | Author | Licence | Used for                                                       | Changes |
| -------------------------------------------------- | ---------------- | ------ | ------- | -------------------------------------------------------------- | ------- |
| `assets/kenney/cartography-pack/castle.png`        | Cartography Pack | Kenney | CC0 1.0 | Castles (pennant and base drawn in SVG in the player's colour) | none    |
| `assets/kenney/cartography-pack/church.png`        | Cartography Pack | Kenney | CC0 1.0 | Cities (bonus points)                                          | none    |
| `assets/kenney/cartography-pack/mine.png`          | Cartography Pack | Kenney | CC0 1.0 | Gold mines (bonus points)                                      | none    |
| `assets/kenney/cartography-pack/treePines.png`     | Cartography Pack | Kenney | CC0 1.0 | Forests (decoration)                                           | none    |
| `assets/kenney/cartography-pack/rocksMountain.png` | Cartography Pack | Kenney | CC0 1.0 | Mountains (decoration)                                         | none    |
| `assets/kenney/cartography-pack/textureWater.png`  | Cartography Pack | Kenney | CC0 1.0 | Wave marks on the sea                                          | none    |

### Gassi gehen

| File                                                             | Source                 | Author | Licence | Used for                                   | Changes |
| ---------------------------------------------------------------- | ---------------------- | ------ | ------- | ------------------------------------------ | ------- |
| `assets/kenney/animal-pack-remastered/round-outline/dog.png`     | Animal Pack Remastered | Kenney | CC0 1.0 | The dog                                    | none    |
| `assets/kenney/scribble-dungeons/characters/green_character.png` | Scribble Dungeons      | Kenney | CC0 1.0 | The person (green token)                   | none    |
| `assets/kenney/cartography-pack/castle.png`                      | Cartography Pack       | Kenney | CC0 1.0 | The castle at the goal                     | none    |
| `assets/kenney/cartography-pack/fence.png`                       | Cartography Pack       | Kenney | CC0 1.0 | The park gate at the start                 | none    |
| `assets/kenney/cartography-pack/treePines.png`                   | Cartography Pack       | Kenney | CC0 1.0 | Park: trees                                | none    |
| `assets/kenney/cartography-pack/treePine.png`                    | Cartography Pack       | Kenney | CC0 1.0 | Park: trees                                | none    |
| `assets/kenney/cartography-pack/rocksA.png`                      | Cartography Pack       | Kenney | CC0 1.0 | Park: rocks                                | none    |
| `assets/kenney/cartography-pack/well.png`                        | Cartography Pack       | Kenney | CC0 1.0 | Park: a well                               | none    |
| `assets/kenney/cartography-pack/bush.png`                        | Cartography Pack       | Kenney | CC0 1.0 | Bushes the dog runs to ("Stöckchen holen") | none    |
| `assets/kenney/scribble-dungeons/tree.png`                       | Scribble Dungeons      | Kenney | CC0 1.0 | "Im Wald": tree crowns seen from above     | none    |
| `assets/kenney/cartography-pack/treePineLarge.png`               | Cartography Pack       | Kenney | CC0 1.0 | "Im Wald": forest                          | none    |
| `assets/kenney/cartography-pack/treePinesSmall.png`              | Cartography Pack       | Kenney | CC0 1.0 | "Im Wald": forest                          | none    |

### Rasenmähen

| File                                                              | Source            | Author | Licence | Used for                        | Changes |
| ----------------------------------------------------------------- | ----------------- | ------ | ------- | ------------------------------- | ------- |
| `assets/kenney/scribble-dungeons/tiles.png`                       | Scribble Dungeons | Kenney | CC0 1.0 | Grid paper around the lawn      | none    |
| `assets/kenney/scribble-dungeons/grass.png`                       | Scribble Dungeons | Kenney | CC0 1.0 | Uncut grass (over a green fill) | none    |
| `assets/kenney/scribble-dungeons/water.png`                       | Scribble Dungeons | Kenney | CC0 1.0 | Ponds                           | none    |
| `assets/kenney/scribble-dungeons/tree.png`                        | Scribble Dungeons | Kenney | CC0 1.0 | Trees                           | none    |
| `assets/kenney/scribble-dungeons/plants.png`                      | Scribble Dungeons | Kenney | CC0 1.0 | Flower beds                     | none    |
| `assets/kenney/scribble-dungeons/characters/red_character.png`    | Scribble Dungeons | Kenney | CC0 1.0 | Mower 1 (number drawn on top)   | none    |
| `assets/kenney/scribble-dungeons/characters/purple_character.png` | Scribble Dungeons | Kenney | CC0 1.0 | Mower 2 (number drawn on top)   | none    |

The problem, its file formats and the competition instance `smr_882k_481_3s3` with its example solution
(`levels/lawn-mowing/competition/`, shown in the theory view) come from CG:SHOP 2027 and
[pyutils27](https://github.com/CG-SHOP/pyutils27) (MIT, © 2026 Technische Universität Braunschweig,
Algorithms Group, Phillip Keldenich). The five booth lawns were made for this edition.

### Straßenbau

| File                                              | Source           | Author | Licence | Used for                               | Changes |
| ------------------------------------------------- | ---------------- | ------ | ------- | -------------------------------------- | ------- |
| `assets/kenney/cartography-pack/house.png`        | Cartography Pack | Kenney | CC0 1.0 | Villages                               | none    |
| `assets/kenney/cartography-pack/houseSmall.png`   | Cartography Pack | Kenney | CC0 1.0 | Villages                               | none    |
| `assets/kenney/cartography-pack/houseChimney.png` | Cartography Pack | Kenney | CC0 1.0 | Villages                               | none    |
| `assets/kenney/cartography-pack/houses.png`       | Cartography Pack | Kenney | CC0 1.0 | Villages                               | none    |
| `assets/kenney/cartography-pack/houseTall.png`    | Cartography Pack | Kenney | CC0 1.0 | Villages                               | none    |
| `assets/kenney/cartography-pack/castle.png`       | Cartography Pack | Kenney | CC0 1.0 | Castles (the levels' `square` markers) | none    |
| `assets/kenney/cartography-pack/treePines.png`    | Cartography Pack | Kenney | CC0 1.0 | Land between the places                | none    |
| `assets/kenney/cartography-pack/treePine.png`     | Cartography Pack | Kenney | CC0 1.0 | Land between the places                | none    |
| `assets/kenney/cartography-pack/rocks.png`        | Cartography Pack | Kenney | CC0 1.0 | Land between the places                | none    |

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

| Library                                                                                                                                                                   | Licence                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| [React](https://react.dev) and React DOM                                                                                                                                  | MIT                       |
| [zustand](https://github.com/pmndrs/zustand)                                                                                                                              | MIT                       |
| [robust-predicates](https://github.com/mourner/robust-predicates) (exact orientation tests; port of Jonathan Shewchuk's predicates)                                       | Unlicense (public domain) |
| [Workbox](https://github.com/GoogleChrome/workbox) (service worker for offline use, generated by vite-plugin-pwa)                                                         | MIT                       |
| [clipper2-ts](https://github.com/countertype/clipper2-ts) (TypeScript port of Angus Johnson's Clipper2: the lit areas, the land of the castles' cells, the coast lines)   | BSL-1.0                   |
| [earcut](https://github.com/mapbox/earcut) (triangulation of the dungeons)                                                                                                | ISC                       |
| [d3-delaunay](https://github.com/d3/d3-delaunay) and [Delaunator](https://github.com/mapbox/delaunator) (Voronoi cells and Delaunay triangulations in "Erobere das Land") | ISC                       |

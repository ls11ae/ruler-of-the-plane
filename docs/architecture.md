# Architecture of the web app (Phase 0)

How the shell and the shared code fit together, and what a game needs to plug in. Rules and
conventions are in `CLAUDE.md`; decisions and their reasons in the decision log of `docs/design-notes.md`.

## Adding a game

A game is discovered at build time (`import.meta.glob` in `src/ui/games/registry.ts`), so adding one
touches no shared file:

1. `src/ui/games/<id>/index.tsx` default-exports the game screen (a component without props). `<id>` is
   one of `GAME_IDS` in the registry: `art-gallery`, `voronoi`, `frechet`, `lawn-mowing`, `roads`. As soon
   as the folder exists, the place on the start map becomes a solid, clickable label and `#/play/<id>`
   opens the game (loaded on demand, inside an error boundary).
2. Rules, scoring and AIs go to `src/core/games/<id>/` (pure TypeScript, no DOM; `tsconfig.core.json`
   checks it without DOM types). Heavy computation goes to a worker in `src/workers/`.
3. Texts go to `src/ui/games/<id>/i18n.de.ts` and `i18n.en.ts` (`en` typed as `typeof de`); pick them with
   `useLocalized({ de, en })`. Shared texts (buttons, result screen) come from `useT()`.
4. Art: import files from `assets/` in the game's folder and add a row per file to the game's section
   of `CREDITS.md`.
5. A Playwright smoke test `e2e/<id>.spec.ts` plays a level and saves screenshots to
   `screenshots/<project>/<id>-*.png` (see `e2e/shell.spec.ts` for the pattern).

## Shared building blocks

| Need                                   | Use                                                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Top bar ("‹ Karte", title, status)     | `components/GameHeader`                                                                                                                                                  |
| Board in level coordinates             | `components/Board` (`bounds`, `padding`); inside it `useBoard()` gives `toBoard(clientX, clientY)`, `pxToBoard(px)`, `ink`                                               |
| Hand-drawn outlines                    | `filter={board.ink}` on a board; `filter="url(#ink)"` where one unit is about one pixel (start map)                                                                      |
| Buttons, keycaps, stars, progress bar  | `components/Button` (`variant`: solid, accent, dashed), `Keycap` (`code`, `pressed`), `Stars`, `ProgressBar`                                                             |
| "So geht's"                            | `components/HowToOverlay` (2–3 sentences, optional animation, key hints)                                                                                                 |
| End of a round                         | `components/ResultScreen` (outcome, stars, "Was steckt dahinter?" text and animation, theory button, leaderboard)                                                        |
| Leaderboard                            | `ResultScreen`'s `leaderboard` prop: board key `<id>/<level>`, `higherIsBetter`, score, format                                                                           |
| "Mensch gegen Maschine"                | `useBooth.getState().recordVersus('human' \| 'machine')` after a game against the computer                                                                               |
| Difficulty set by the staff            | `useSettings((s) => s.difficulty)` (`easy`, `normal`, `hard`) as the default                                                                                             |
| Levels                                 | `useLevel<ArtGalleryLevel>('art-gallery/agLevel4_8')`, `loadLevelIndex()` (`src/ui/levels.ts`; format in `src/core/levels/schema.ts`)                                    |
| Pointer input (mouse, touchpad, touch) | `usePointerGesture({ onPress, onTap, onDragStart, onDragMove, onDragEnd, onLongPress })`                                                                                 |
| Keys (two players on one keyboard)     | `keyboard.isDown(code)` per frame with `useAnimationFrame`; `useKeyRepeat(codes, onStep, { delay, interval })` for lattice steps; `useKeyCapture(codes)` stops scrolling |
| Gamepads                               | virtual codes `Pad<i>Up/Down/Left/Right/A/B/X/Y/Start` in the same key state                                                                                             |
| Exact predicates, polygons             | `src/core/geometry/predicates.ts`, `polygon.ts`                                                                                                                          |
| Seeded randomness                      | `mulberry32(seed)` in `src/core/random.ts`                                                                                                                               |

`#/demo` shows these pieces on a real level; use it to check the look.

## Shell

- Routes are hashes (`#/`, `#/play/<id>`, `#/demo`), so GitHub Pages and a local build need no server
  rewrites. `src/ui/shell/router.ts`.
- Settings (`language`, `kiosk`, `disabledGames`, `difficulty`) and booth data (leaderboards, versus
  tally) are zustand stores persisted in `localStorage` (failures ignored). Nothing leaves the device.
- Start map: `src/ui/shell/StartMap.tsx`, art in `MapArt.tsx`, positions per layout (landscape for
  laptops, portrait for phones) in `mapLayout.ts`. Labels are HTML over the SVG, sized in container
  query units.
- Kiosk mode (`?kiosk` in the URL or the staff menu): the app starts on the attract screen and returns
  there after 90 s without input, with the language reset to German.
- Staff menu: hold the compass on the start map for 3 s, or press Ctrl+Shift+S; then the PIN from
  `VITE_STAFF_PIN` (no PIN if empty).
- Offline: vite-plugin-pwa precaches the build (code, fonts, art, every level JSON). A new version takes
  over on the next load.

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
5. Optionally `src/ui/games/<id>/attract.tsx` default-exports a demo that the kiosk's attract screen plays
   behind its text (e.g. the computer against itself); it is discovered like the game.
6. New level sources (made for this edition) go to `levels/<id>/` and are converted by `npm run levels`
   (folder → collection in `NEW_FOLDERS` of `scripts/levels/convert.ts`); `legacy/` stays the read-only
   copy of the Unity files. JSON sources have their own converter, called from `scripts/levels/import.ts`
   (`lawns.ts` for pyutils27 lawns, `roads.ts` for the bonus maps of "Straßenbau", which also checks
   their stored optima); maps whose optima are computed offline keep their generator in `scripts/<game>/`
   (e.g. `scripts/roads/`).
7. A Playwright smoke test `e2e/<id>.spec.ts` plays a level on the laptop (1280 × 800) and the phone
   (390 × 844) in Chromium, Firefox and WebKit (six projects; Firefox and WebKit run in CI, see
   `playwright.config.ts`) and saves screenshots to `screenshots/<project>/<id>-*.png` with `shot()` from
   `e2e/helpers.ts` (animations disabled). Import `test` and `expect` from `e2e/fixtures.ts` and branch on
   its option `phone` (Firefox has no `isMobile`). `e2e/art-gallery.spec.ts` shows how to map level coordinates to the screen (also on a
   turned board) and how to do a touch drag with Pointer Events; `e2e/frechet.spec.ts` how to hold keys
   or several touch buttons at once. Call `expectHeaderLaidOut(page)` (helpers) once the game shows its
   header: it fails if title, status and buttons overlap. Add the game's id to the loop at the end of
   `e2e/a11y.spec.ts`, which checks its how-to, setup, board and theory with axe-core and with own checks
   of text contrast against the drawn background, text sizes (at least 14 px) and 44 px hit targets.

## Shared building blocks

| Need                                   | Use                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top bar ("‹ Karte", title, status)     | `components/GameHeader`                                                                                                                                                                                                                                                                                               |
| Board in level coordinates             | `components/Board` (`bounds`, `padding`, `autoRotate` for portrait phones); inside it `useBoard()` gives `toBoard(clientX, clientY)`, `pxToBoard(px)`, `ink`, `rotation`, `upright(x, y)`; static art under the ink filter goes to `under` or `over` (drawn once, in layers of their own), tokens above it to `front` |
| Hand-drawn outlines                    | `filter={board.ink}` on a board; `filter="url(#ink)"` where one unit is about one pixel (start map)                                                                                                                                                                                                                   |
| Buttons, keycaps, stars, progress bar  | `components/Button` (`variant`: solid, accent, dashed), `Keycap` (`code`, `pressed`), `Stars`, `ProgressBar`                                                                                                                                                                                                          |
| "So geht's"                            | `components/HowToOverlay` (2–3 sentences, optional animation, key hints)                                                                                                                                                                                                                                              |
| End of a round                         | `components/ResultScreen` (outcome or an own `title`, stars, "Was steckt dahinter?" text and animation, theory button, leaderboard)                                                                                                                                                                                   |
| Leaderboard                            | `ResultScreen`'s `leaderboard` prop: board key `<id>/<level>`, `higherIsBetter`, score, format (nickname picker with the last name first and a lucky number built in)                                                                                                                                                 |
| "Mensch gegen Maschine"                | `useBooth.getState().recordVersus('human' \| 'machine')` after a game against the computer                                                                                                                                                                                                                            |
| Difficulty set by the staff            | `useSettings((s) => s.difficulty)` (`easy`, `normal`, `hard`) as the default                                                                                                                                                                                                                                          |
| Levels                                 | `useLevel<ArtGalleryLevel>('art-gallery/agLevel4_8')`, `loadLevelIndex()` (`src/ui/levels.ts`; format in `src/core/levels/schema.ts`)                                                                                                                                                                                 |
| Pointer input (mouse, touchpad, touch) | `usePointerGesture({ onPress, onTap, onDragStart, onDragMove, onDragEnd, onLongPress })`                                                                                                                                                                                                                              |
| Keys (two players on one keyboard)     | `keyboard.isDown(code)` per frame with `useAnimationFrame`; `useKeyRepeat(codes, onStep, { delay, interval })` for lattice steps; `useKeyCapture(codes)` stops scrolling                                                                                                                                              |
| Gamepads                               | virtual codes `Pad<i>Up/Down/Left/Right/A/B/X/Y/Start` in the same key state                                                                                                                                                                                                                                          |
| Exact predicates, polygons             | `src/core/geometry/predicates.ts`, `polygon.ts`                                                                                                                                                                                                                                                                       |
| Seeded randomness                      | `mulberry32(seed)` in `src/core/random.ts`                                                                                                                                                                                                                                                                            |

`#/demo` shows these pieces on a real level; use it to check the look.

## Shell

- Routes are hashes (`#/`, `#/play/<id>`, `#/tsp`, `#/demo`), so GitHub Pages and a local build need no
  server rewrites. `src/ui/shell/router.ts`.
- "Rundreise" (`VITE_TSP_BOARDS_URL`, read by `tspBoardsUrl()` in `shell/places.ts`): a new tab outside
  kiosk mode; in kiosk mode `#/tsp` (`shell/TspFrame.tsx`) shows tsp-boards' event mode in a frame below
  "‹ Karte", and `watchFrame` (`shell/idle.ts`) lets input inside the same-origin frame reset the kiosk
  timeout. `e2e/tsp-frame.spec.ts` checks it for a build with the variable (stub page, or the real build
  with `TSP_BOARDS_DIST`). Tests stub build variables with `vi.stubEnv` instead of assuming them unset.
- Settings (`language`, `kiosk`, `disabledGames`, `difficulty`) and booth data (leaderboards, versus
  tally) are zustand stores persisted in `localStorage` (failures ignored). Nothing leaves the device.
- Start map: `src/ui/shell/StartMap.tsx`, art in `MapArt.tsx`, positions per layout (landscape for
  laptops, portrait for phones) in `mapLayout.ts`. Labels are HTML over the SVG, sized in container
  query units.
- Kiosk mode (`?kiosk` in the URL or the staff menu): the app starts on the attract screen and returns
  there after 90 s without input, with the language reset to German. Nothing leaves the app there: "Alte
  Ruinen" shows its address, "Rundreise" opens in a frame.
- Staff menu: hold the compass on the start map for 3 s, or press Ctrl+Shift+S; then the PIN from
  `VITE_STAFF_PIN` (no PIN if empty).
- "Impressum · Datenschutz" in the start map's logo line (`shell/LegalDialog.tsx`, addresses in
  `shell/legal.ts`): links to the Algorithm Engineering Group's pages; in kiosk mode their addresses with
  QR codes from the generated `shell/legalQr.ts` (`npm run qr`).
- Booth: the offline package for the Windows laptops serves this build at `/ruler-of-the-plane/` and
  tsp-boards at `/tsp-boards/` from a PowerShell server (`booth/README.md`).
- Offline: vite-plugin-pwa precaches the build (code, fonts, art, every level JSON). A new version
  installs in the background and waits; the app activates it and reloads as soon as it shows the start
  map or the attract screen, never during a game (`src/main.tsx`, `shell/update.ts`). An open page checks
  for a new version every hour.

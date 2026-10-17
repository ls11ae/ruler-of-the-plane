# Ruler of the Plane (web edition)

Browser games that make computational geometry tangible, for walk-up visitors at the TU Dortmund open
house (**Tag der offenen Tür, Saturday 7 November 2026**) and for playing at home via a QR code.

This is a new web implementation of the Unity games in `github.com/kbuchin/ruler` (2017–2020, TU
Eindhoven). The Unity version is the reference for rules, levels and texts, not a specification: deviate
wherever it makes a game clearer or more fun for visitors.

**Before porting a game, read `docs/legacy-unity-notes.md`.** It records the rules, parameters, level
format, texts and known bugs of every Unity game, so the C# code does not need to be re-analysed.
**The target look is shown in `docs/look/`** (style mockup, one screenshot per screen).
Design decisions go to the decision log in `docs/design-notes.md`.

## Status

- Phases 0–6 merged into `main` (2026-10-17): the shell, all five games, the Phase 6 items that need no
  booth laptop (credits screen, accessibility pass, simulated 2-hour attract run, "Rundreise" with the
  online tsp-boards), the chair's solver solutions for "Rasenmähen" and the bonus set "Im Wald" for
  "Gassi gehen"; Kevin agreed to all "proposed" decisions so far (2026-10-17). After Kevin's first
  playtest: two harder sets of "Straßenbau" ("Kreuzungen", "Zwei Sorten") with exact optima computed
  offline (`scripts/roads/`) and a step back per mower in "Rasenmähen" (merged 2026-10-17), and harder
  tiers "Mittel" and "Schwer" for "Gassi gehen" (generated walks in the park and in the woods,
  `scripts/gassi/`; merged 2026-10-17). Open are the items that need the booth laptops (playtest, the
  200 ms "Schwer" move, the key test). **`docs/roadmap.md` is the source of truth
  for open work**, in its order. How the shell and the shared code fit together and how a game plugs in:
  `docs/architecture.md`.
- Repository `ls11ae/ruler-of-the-plane` (public, MIT). Default branch `main`. The app lives at the
  repository root.
- `legacy/` holds the Unity level files and in-game texts (copied from `kbuchin/ruler` at commit
  `b2d1a2d`). Read-only: never edit them; the importer converts them.

## How this repository is worked on

- Mostly with **Claude Code on the web** (cloud sessions). The sessions are started by `mbuchin`;
  `kbuchin` (Kevin Buchin) owns the project and decides open rule questions. See `docs/cloud-sessions.md`.
- **One session works on one phase** (from Phase 2 on: one track) on its own branch. Push after every
  finished roadmap item. When the phase is done, or the session has to stop, end with a short report: a
  pull request title, a description listing what was done, any "proposed" decisions and any change to
  shared code, and what is left. The person running the session creates the pull request and merges it
  when CI is green, checks the deployed site, and tags `main` as `phase-<n>` after the last merge of a
  phase. A later session continues from `main`.
- Cloud environment: Ubuntu, **Node 22** on the PATH (hence `.nvmrc` = 22; the stack needs ≥ 22.13),
  npm, git, Python with pip. Network access "Trusted": the npm registry, PyPI and GitHub work, most other
  sites (kenney.nl, CDNs, `*.github.io`) do not. That is why all art and fonts are already in `assets/`;
  never add a build step that downloads anything else.
- The cloud image ships an older Chromium at `/opt/pw-browsers/chromium`; `playwright.config.ts` uses it
  outside CI, so `npm run build && npm run e2e` works in the session and you can look at the screenshots
  in `screenshots/`. No need for `npx playwright install` in a session. CI installs the matching browser
  and uploads the screenshots as workflow artifacts.
- Pushing files under `.github/workflows/` may be refused if the session's GitHub credential lacks
  workflow rights. Then save the workflow files under `docs/ci/` instead, say so in the report, and the
  person adds them through the GitHub web interface.
- `.claude/settings.json` runs `scripts/cloud-session-start.sh` at session start: in cloud sessions it
  installs the npm dependencies, locally it does nothing.

## Agreed direction

- **Browser-first static web app**, no backend, no accounts. All computation client-side, heavy parts
  (AI search) in Web Workers. Must run offline on the booth laptops (local build or PWA) and from
  GitHub Pages at `ls11ae.github.io/ruler-of-the-plane/` (set Vite's `base` accordingly).
- **Stack as in `ls11ae/tsp-boards`** (Kevin's repository; not needed here): TypeScript `~6.0`
  (strict; not 7, which typescript-eslint does not support yet), React 19, Vite 8, Vitest 5, ESLint 10
  flat config with typescript-eslint, Prettier 3, zustand, own typed i18n dictionaries.
  `"engines": {"node": ">=22.13"}` in `package.json`. If a tool version requires a newer Node, use the
  newest version that supports Node 22 and note it in the decision log. Never use `--force` or
  `--legacy-peer-deps`. Scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`,
  `format:check`, `test`, `levels` (run the level importer), and `check` = format check, lint,
  typecheck, tests, build.
- **German first**, English via a switch. Texts short: 2–3 sentences per screen, rules shown as a short
  animation where possible.
- **Booth hardware = laptops** (decided 2026-10-16): mouse or touchpad plus keyboard are the normal case
  at the booth: Windows laptops with Chrome or Firefox and standard mice (Kevin, 2026-10-17). Pointer
  Events cover mouse, pen and touch; hit targets ≥ 44 px. Hover may add previews, but every action must
  also work by click or tap.
- **Phones in portrait** (Kevin, 2026-10-16): visitors open the QR code on their phones, so every game
  must be playable on a phone in portrait: use the screen well (e.g. rotate a wide board by 90°), keep
  touch targets ≥ 44 px, and give the keyboard games on-screen controls (hold buttons, direction pad).
- **Keyboard games for two players on one laptop**: each player presses at most one key at a time, keys
  far apart (A/L, WASD/arrows), read via `KeyboardEvent.code` (layout-independent, QWERTZ-safe), own
  key-state tracking instead of OS auto-repeat. Laptop keyboards often register only two or three keys
  at once; the staff menu has a key test. The Gamepad API is an optional second input.
- **Rendering in SVG** (a few hundred shapes per scene), `touch-action: none` on boards.
- **Geometry libraries**: `robust-predicates` (exact orientation / in-circle), `d3-delaunay` (Delaunay,
  and Voronoi cells clipped to the board via `voronoi(bounds)`), `clipper2-ts` (union / difference on
  integer coordinates: scale level coordinates to integers), `earcut` (triangulation for drawing).
  Own code only where no library fits: visibility polygon, ham-sandwich cut, greedy spanner,
  Fréchet distance, Steiner heuristics.
- **Levels** come from `legacy/levels/` (IPE files, five Unity `.asset` files). `scripts/import-ipe.ts`
  (run by `npm run levels`) converts them to JSON in `public/levels/` with culture-invariant number
  parsing; the generated JSON is committed, and a test checks that it matches a fresh import. New levels
  are authored in IPE as before.
- **Build variables** (Vite `VITE_*`, set as GitHub Actions repository variables for the Pages build;
  document them in `.env.example`): `VITE_TSP_BOARDS_URL` for the "Rundreise" tile (tsp-boards' gallery,
  `https://ls11ae.github.io/tsp-boards/`, set for the Pages build; hidden while unset; tests stub it with
  `vi.stubEnv` and never assume it unset), `VITE_STAFF_PIN` for the staff menu (a public bundle is readable by
  anyone: the PIN only keeps booth visitors out).
- **TSP is not rebuilt here**: the "Rundreise" tile opens tsp-boards in a new tab; in kiosk mode it shows
  tsp-boards' event mode (`#kiosk`) in a frame below "‹ Karte", which must be on the same origin so the
  kiosk timeout sees the input there (GitHub Pages: both on `ls11ae.github.io`; the booth package serves
  tsp-boards at `/tsp-boards/`). Nothing in kiosk mode leaves the app ("Alte Ruinen" shows its address).
- **The old version stays at `kbuchin.github.io/ruler/`**; the start screen links to it ("Alte
  Ruinen", see `docs/look/start-map.webp`). Nothing in this repository changes the old site.
- **Privacy**: no third-party requests (no Google Fonts, no CDNs, no analytics); fonts and libraries are
  bundled. The QR-code landing page links to the Impressum and privacy notice of the Algorithm
  Engineering Group, TU Dortmund (`https://ae.cs.tu-dortmund.de/`; Kevin, 2026-10-17).

## Domain facts (do not rediscover)

- Audience: high-school students and families. A game must be understood in 10 seconds and played in
  2–5 minutes. Every game ends with "Was steckt dahinter?": three sentences plus an animation of how the
  computer solves it (or, for the art gallery, of the guarantee below).
- Art gallery: a level is a polygon, 9 of the 14 Unity levels with holes ("pillars"); a torch sees its
  visibility polygon (exact, a point). "Fully lit" is judged by thickness (Kevin, 2026-10-16): the dark
  region (level minus the union of visibility polygons, Clipper2), shrunk by r = 0.03 level units, is
  empty, i.e. no dark spot is thicker than 0.06 units; the remaining hairlines are shown lit, and while
  not lit a pulsing dot marks the thickest dark spot. An area tolerance would accept a half-dark niche
  (the smallest niches of agLevel8_4 are 0.29 % of the floor); the Unity version used an area ratio plus
  checkpoints, which was fragile. r is tuned in the playtest.
- The 14 art gallery levels are the 2020 set of "Designing Art Galleries" (van Benthem, Buchin,
  Kostitsyna, Slot; SoCG 2020 Media Exposition): agLevel7_13 is its planar 3SAT construction (13 torches
  are necessary, no record possible), agLevel12_7 its planar vertex cover construction, agLevel13_4 a
  spike box (least liked in the paper's user study, hence in the expert set).
- Art gallery bounds: ⌊n/3⌋ torches always suffice for polygons without holes (Chvátal); with h holes
  ⌊(n+h)/3⌋, where n counts all vertices including those of the holes; for orthogonal polygons without
  holes ⌊n/4⌋ (Kahn, Klawe, Kleitman; of the shipped levels only agLevel3_2, 18 corners, so 4 instead
  of 6; the game names it there). Fisk's proof (triangulate, 3-colour, take the smallest colour class) works only without
  holes, so its animation is shown on the hole-free levels (Unity levels 1, 3, 6, 8, 13). Present it as
  a guarantee, not as the solution: the bound ⌊n/3⌋ is 5, 6, 6, 15 and 11 on those levels, far above
  their k = 3, 2, 3, 4, 4, and finding the minimum is NP-hard.
- Voronoi game ("Erobere das Land"): a map has land and water; only land scores, castles stand only on
  land, cities (or gold mines) add bonus points to whoever owns the cell containing them, and castles
  keep a minimum distance from all other castles. Score = land area of a player's cells (clipped to the
  map) plus city bonuses. The AI evaluates candidate moves on a land raster (fast, exact enough); the
  displayed score may use exact clipping. Its evaluation doubles as the "best next move" heatmap.
- MST: a player's network is optimal iff it is a spanning tree with the MST's length (compare lengths,
  not edge sets, because of ties). Kruskal is the teaching animation.
- Steiner trees: Steiner points have degree 3 and 120° angles; for an equilateral triangle the Steiner
  tree is 13.4 % shorter than the MST. No exact solver in the browser: curated levels carry precomputed
  optima in their JSON ("Kreuzungen": every full topology with Smith's iteration, `scripts/roads/steiner.ts`).
- Plane bichromatic spanning tree ("Zwei Sorten"): every road joins a castle and a village, no two roads
  cross. Without the crossing rule Kruskal on the castle–village roads; with it NP-hard (Borgelt et al.
  2009), the optimum at most O(log n) times longer (Akitaya et al., ISAAC 2024; a constant is open).
  Optima by CP-SAT offline (`scripts/roads/bichromatic.py`, `pip install ortools`).
- t-spanner: dilation = max over pairs of graph distance / Euclidean distance. Greedy spanner: take
  edges by increasing length, add one when the current graph distance exceeds t times its length.
- Ham sandwich: two finite point sets can always be bisected by one line; three sets in general cannot
  (that is why the Unity game lets players swap soldiers).
- Fréchet distance ("Gassi gehen", walking the dog): person and dog move monotonically along their
  curves. Decision for a leash length ε via reachability in the free-space diagram (O(nm) cells); the
  distance itself via search over the critical values. A player's joint walk is a monotone curve in the
  diagram, whose axes are the arc lengths along the two paths. The theory view shows the diagram with an
  ε slider, the player's and the optimal walk, the positions belonging to the point under the mouse, and
  the critical values. Person and dog walk at the same speed, so holding both keys moves along a fixed
  slope (path lengths differ) and players must sometimes let one walker wait: that is the lesson.
- Lawn mowing ("Rasenmähen", CG:SHOP 2027, see `github.com/CG-SHOP/pyutils27`): the lawn is a polyomino
  with holes on the integer grid, the cutter a polyomino with a reference lattice point `cutter_center`
  (on or inside the cutter, possibly on its boundary), k cutters. Each tour is a closed axis-parallel
  polyline of the reference point, given by its corner points. The footprint at a lattice point p is the
  cutter shifted by p − `cutter_center`; the mowed area is the union of the footprints over all lattice
  points on all tour edges (Minkowski sum). Cutters may leave the region and do not interfere.
  Objective: minimise the longest tour (L1 length). For a w × w square cutter each unit step sweeps at
  most w new cells, which gives a simple lower bound. Read instances and solutions in the pyutils27 JSON
  formats (`CGSHOP2027_Instance`, tours as `x`/`y` lists).

## Layout

- `src/core/` pure TypeScript, no DOM: geometry, game rules and scoring, AIs, level schema.
- `src/ui/` the React app: `shell/` (start map, routes, kiosk mode, staff menu, settings and booth data),
  `components/` (shared UI: board, header, overlays, result screen, leaderboard), `input/` (pointer,
  keyboard, gamepad), `i18n/`, and `games/<game>/` per game (discovered by `games/registry.ts`).
- `src/workers/` Web Worker entry points.
- `scripts/` level import and helper scripts (`cloud-session-start.sh` belongs to the session setup).
- `public/levels/` generated level JSON, committed.
- `assets/` source art and fonts with their licence files; import what you use from code, Vite then
  bundles only the imported files. `assets/kenney/<pack>/` holds the subsets listed in `CREDITS.md`.
- `legacy/` read-only Unity level files and texts. `docs/look/` the style mockup.
- `e2e/` Playwright smoke tests (run in CI and in sessions, see above).

## Conventions

- npm, Vite, Vitest, strict TypeScript, ESLint + Prettier. CI on GitHub Actions for pull requests and
  pushes to `main` (format check, lint, typecheck, tests, build, Playwright); `main` deploys to GitHub
  Pages.
- Prettier and ESLint ignore `legacy/`, `assets/`, `public/levels/` and `docs/look/`. Prettier formats
  the Markdown docs; run it over them once in Phase 0.
- Seeded RNG for level generation and AIs, so bugs are reproducible.
- Tests: geometry against brute force or sampling (visibility area vs. Monte Carlo, Voronoi areas sum to
  the board area, MST vs. brute force for n ≤ 8, Fréchet decision vs. discrete Fréchet on densely
  sampled curves). One Playwright smoke test per game that plays a level in both projects (laptop and
  phone) and saves screenshots.
- UI texts only in typed i18n dictionaries: shared texts in `src/ui/i18n/de.ts` and `en.ts`, game texts
  in `src/ui/games/<game>/i18n.de.ts` and `i18n.en.ts`, so parallel tracks do not edit the same file.
  Code, comments, commits and docs in English.
- Credits: `CREDITS.md` lists the original Unity team, every asset file the app uses (in the section of
  the game that uses it, or "Shared"), the fonts and the runtime libraries; the app shows the credits
  (`#/credits`, with CREDITS.md and every licence text in the build's `credits.txt`). Update it in the
  same pull request that starts using a file or library; `scripts/credits.test.ts` fails otherwise.
- Asset licences: only CC0, CC BY 3.0/4.0 and (for fonts) OFL; no NC or ND; CC BY-SA only after asking
  Kevin. Use the font files unmodified (no subsetting; Eagle Lake has a Reserved Font Name).
- Patrick Hand has no arrows (← ↑ → ↓) and no Greek letters: draw arrow keycaps and arrows as SVG, and
  write ε etc. in a fallback font.
- Missing assets (e.g. TU Dortmund / LS 11 logos): use a text placeholder and carry on.
- Look (decided 2026-10-16, mockup in `docs/look/`): Kenney packs, all CC0, in two ink styles that
  belong together, "the King's sketchbook":
  - Cartography Pack (`assets/kenney/cartography-pack/`): parchment, castles, towns, mills, forests,
    mountains, roads, compass. For the start screen (a map of the kingdom with one place per game),
    "Erobere das Land", "Straßenbau" and the park in "Gassi gehen". Coastlines and lakes of any shape
    are SVG ink lines; territories are translucent colour washes over the parchment.
  - Scribble Dungeons (`assets/kenney/scribble-dungeons/`, top-down, 128 px tiles): grid-paper floor,
    chests, barrels, grass, coloured tokens. For "Licht ins Verlies" (floor as a pattern clipped to the
    level polygon, walls as sketchy SVG strokes, since the levels are not grid polygons) and
    "Rasenmähen" (uncut cells with grass, mowed cells striped, cutters as coloured tokens).
  - Animal Pack Remastered (`assets/kenney/animal-pack-remastered/round-outline/`): `dog.png` (looks like
    a wolf) is the dog in "Gassi gehen"; other animal heads are optional extras.
  - Fonts (`assets/fonts/`, OFL): Eagle Lake for titles and place names, Patrick Hand for all other
    text. Key glyphs are drawn as keycaps (as in the mockup), not taken from a pack.
- Style rules: black ink on paper or parchment; colour only for players, light and territories; a slight
  SVG displacement filter makes outlines look hand-drawn. The old TU/e art is not used.
- Accessibility (Phase 6): colour is never the only cue (add a shape, hatching, a mark or a word), texts
  at least 14 px, hit targets 44 px (small buttons have an invisible extension). `e2e/a11y.spec.ts` checks
  every screen with axe-core and with own checks of text contrast against the drawn background; add new
  games and screens to it.

## Working mode

- Work autonomously and decide by best judgement; record each decision briefly in the decision log of
  `docs/design-notes.md` (decision, alternatives, reason). Entries marked "proposed" still need Kevin's OK;
  list them in the session report.
- Open work comes from `docs/roadmap.md`, in order; mark items done there when finished.
- Small, focused commits. Before pushing, run `npm run check` and fix what fails.
- Parallel tracks (from Phase 2 on, see the roadmap) run as parallel cloud sessions, each on its own
  branch. Each game lives in its own folders (`src/core/games/<game>/`, `src/ui/games/<game>/`). Keep
  changes to shared code small, in separate commits, and list them in the report. Decision-log entries
  of a track go into that track's subsection of the log. If the other track's pull request was merged
  first, merge `origin/main` into your branch and resolve conflicts before pushing.
- Playwright screenshots of each game at 1280 × 800 and 390 × 844 come from CI.
- Stop only if genuinely blocked, e.g. a rule decision that changes how a game plays; then ask the
  person running the session.

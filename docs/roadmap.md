# Roadmap

Source of truth for open work (see `CLAUDE.md`, "Working mode"). Work through the phases in order, record
decisions in the decision log of `docs/design-notes.md`, and mark items done here ("— done <date>").

Deadline: the booth at the TU Dortmund open house on **Saturday 7 November 2026**, run on laptops with
mouse and keyboard. Phases 0–7 are the booth edition; Phase 8 is the backlog for afterwards. Every phase
ends with a tag `phase-<n>` on `main`, so the booth can always fall back to the last working state.

After Phase 1, two tracks run in parallel, each in its own cloud session and branch:

- Track A: Phase 2 ("Erobere das Land"), then Phase 4 ("Rasenmähen").
- Track B: Phase 3 ("Gassi gehen"), then Phase 5 ("Straßenbau", optional).

If time runs short, drop Phase 5 first; the two research games and the playtest have priority.

## Phase 0: foundation (target 20 Oct)

- Scaffold the app at the repository root with the toolchain described in `CLAUDE.md` (Node ≥ 22.13,
  TypeScript `~6.0`); Prettier and ESLint ignores as in `CLAUDE.md`, then format the Markdown docs once;
  `npm run check` green; CI on GitHub Actions for pull requests and pushes to `main`, including a
  Playwright job that uploads screenshots as artifacts (if pushing workflow files is refused, see
  `CLAUDE.md`).
- `.env.example` with the build variables `VITE_TSP_BOARDS_URL` and `VITE_STAFF_PIN`; the Pages
  workflow reads them from GitHub Actions repository variables.
- GitHub Pages via Actions: a workflow builds `main` and deploys it to
  `ls11ae.github.io/ruler-of-the-plane/` (Vite `base`). Kevin switches Settings → Pages → Source to
  "GitHub Actions" once. The old site at `kbuchin.github.io/ruler/` stays untouched.
- Shell: start screen as in `docs/look/start-map.webp` (parchment map of the kingdom, one labelled place
  per game, places without a game yet shown dashed), German/English switch, fullscreen button, "Alte
  Ruinen" linking to `https://kbuchin.github.io/ruler/`, "Rundreise" linking to tsp-boards (build
  variable, hidden while unset).
- Kiosk mode: after 90 s without input, return to an attract screen; a hidden staff menu (long press or
  a key combination, then the PIN from `VITE_STAFF_PIN`) resets leaderboards, enables or disables games, sets the difficulty and
  offers a key test (shows every key currently held, to find rollover limits of the laptop keyboard).
- Input layer: Pointer Events for mouse, touchpad and touch; a keyboard module with key-state tracking by
  `KeyboardEvent.code` and fixed-rate repeat; optional Gamepad API.
- Shared UI: SVG board component (fits the screen, ≥ 44 px hit targets), sketchy buttons and keycaps as
  in the mockup, "So geht's" overlay, result screen with a "Was steckt dahinter?" panel and a button for
  the game's theory view, local daily leaderboard with nicknames chosen from a list, "Mensch gegen
  Maschine" counter.
- Assets: use the files in `assets/` (already in the repository: Kenney packs CC0, fonts OFL); start the
  per-file list in `CREDITS.md`. TU Dortmund / LS 11 logos are placeholders until provided.
- `scripts/import-ipe.ts` (`npm run levels`): convert all levels in `legacy/levels/` to JSON in
  `public/levels/` (rules in `docs/legacy-unity-notes.md`):
  - read only the paths and markers inside `<page>`; apply each path's and marker's `matrix`
    correctly (x' = a·x + c·y + e, y' = b·x + d·y + f; 15 of the 32 IPE files use one, on paths or on
    markers); IPE's y axis points up, so flip y for SVG;
  - normalise every level the same way (centre it, scale the larger side of the bounding box to a
    fixed size); the five `.asset` levels were made by hand in Unity units and are not normalised
    (e.g. `divLevel1_0` spans 3.7 × 2.8, `hullLevel2` 3 × 6);
  - culture-invariant number parsing; ignore paths with fewer than 3 vertices (`agLevel14_17.ipe` has
    one with 2);
  - key Kings Taxes levels by their folder (`MST/`, `TSP/` and `Spanner/` reuse the names `ktLevel1…`);
  - the five levels stored only as Unity `.asset` YAML (`Divide/divLevel1_0`, `divLevel2_0`,
    `divLevel3_2`, `ConvexHull/hullLevel1`, `hullLevel2`) are converted by a small YAML reader;
  - tests on the shipped levels: outer polygon simple, holes inside it and pairwise disjoint, outer
    polygon plus holes a valid polygon, parameters as in the file names, and the committed JSON equal
    to a fresh import.

Acceptance: the shell runs on a laptop (mouse and keyboard) and on a phone and works offline after the
first load; all 37 Unity levels are available as JSON (14 art gallery, 4 + 4 + 3 Kings Taxes, 9 Divide,
3 convex hull); the Pages deployment serves the shell.

## Phase 1: "Licht ins Verlies" (art gallery) (target 23 Oct)

- Click to place a torch, drag to move, drag off the dungeon to remove.
- Visibility polygon for polygons with holes (own angular sweep on exact predicates).
- Live "x % beleuchtet" while dragging; the unlit region is darkened (Clipper2 difference).
- Win as soon as everything is lit. Stars: at most k torches (the level's number) three, k + 1 two, more
  one; fewer than k is shown as a record.
- Levels: the 14 Unity levels re-ordered by difficulty; levels with 12 or more torches go to an expert
  set. If a floor plan is available, add a TU Dortmund building as a level.
- Explanation on hole-free levels (Unity levels 1, 3, 6, 8, 13): animation of Fisk's proof (triangulate,
  3-colour, take the smallest colour class). Theory view: visibility polygons and the triangulation.
- Look as in `docs/look/licht-ins-verlies.webp`: Scribble grid-paper floor clipped to the level, hatched
  rock outside and in pillars, sketchy SVG walls, props as decoration under the light, torches as yellow
  tokens with a flame, lit area warm, unlit area dark. Optional extra levels built from tiles as
  orthogonal polygons; without holes, ⌊n/4⌋ torches always suffice (Kahn, Klawe, Kleitman).

Acceptance: on every level, random torch placements are judged identically by the exact check and by a
fine raster check (up to the sliver tolerance in `CLAUDE.md`); dragging stays smooth on a booth laptop.

## Phase 2 (track A): "Erobere das Land" (Voronoi game) (target 27 Oct)

- Maps with land and water, authored in IPE (define and document the convention, e.g. a layer for land
  polygons with lakes as holes, `square` markers for cities, `cross` markers for gold mines). At least
  three maps: island, river valley, lake district.
- Rules: castles only on land; a minimum distance to every castle, shown as a circle while aiming; score
  = land area of a player's cells plus city and gold-mine bonuses.
- Two players or against the computer, 5 or 10 castles each. Hovering shows a ghost castle with its
  future cell and the points it would gain; a click places it (touch: press and hold, release).
- AI in a worker: candidate positions on land with jitter, gain evaluated on a land raster. "Leicht"
  picks a random move among the good ones, "Schwer" the best move with one ply of look-ahead. Attract
  mode = AI vs. AI.
- Look as in `docs/look/erobere-das-land.webp`: Cartography Pack on parchment, coast with offset ink
  lines, castles with a pennant and base in the player colour, towns and a mine with bonus badges,
  territories as colour washes, dashed cell borders.
- Theory view: Voronoi diagram, Delaunay triangulation and empty circumcircles as buttons; heatmap of
  the gain of the next move (the AI's evaluation).

Acceptance: an AI move takes under 200 ms on a booth laptop; "Schwer" beats "Leicht" in at least 70 % of
AI-vs-AI games; raster and exact scores differ by less than 1 % of the land area.

## Phase 3 (track B): "Gassi gehen" (Fréchet distance) (target 29 Oct)

- Two paths through the castle park; owner and dog each move only forward along their own path while
  their key is held (owner `KeyA`, dog `KeyL`; two players or one player with two hands), at the same
  speed. The leash is drawn and turns orange-red when nearly taut; exceeding the length limit L fails the
  level; levels lower L towards the Fréchet distance.
- Solo mode "Schätz die Leine": pick a length with a slider; the computer shows whether a walk exists.
- Theory view (panel beside the park, as in `docs/look/gassi-gehen.webp`): free-space diagram
  (x = owner's position, y = dog's position, light = leash long enough) with an ε slider; the player's
  walk and the optimal monotone walk drawn as curves; hovering a point of the diagram shows the matching
  positions and leash on the map; critical values marked; a sandbox to draw one's own paths.
- Look: park from the Cartography Pack, the owner's path as a footpath (walked part darker), the dog's
  trail dotted (walked part solid), owner = green Scribble token, dog = `animal-pack-remastered`
  `dog.png`.
- Core: Fréchet decision and distance for polylines with up to 20 segments, property-tested against the
  discrete Fréchet distance on densely sampled curves.

Acceptance: correct decisions on random curves; two people can play it on one laptop keyboard (checked
with the key test on the booth laptops).

## Phase 4 (track A): "Rasenmähen" (CG:SHOP 2027 lawn mowing) (target 31 Oct)

- Read instances and solutions in the pyutils27 JSON formats; booth lawns are small polyominoes with
  holes (300–500 cells) and a 3 × 3 cutter; 1 or 2 cutters.
- Controls: cutter 1 with WASD, cutter 2 with the arrow keys; holding a key moves one lattice step at a
  fixed rate. Cutters may leave the lawn and cross holes (holes need no mowing). A "Feierabend" key
  (space) drives every cutter back to its start on the shortest (L1) way and closes the tour.
- Live display: mowed share, steps per cutter, the longest tour (the score), and the target from the
  chair's solver for this lawn (stored with the level; shown as a placeholder until provided).
- Theory view: the solver's tours as an animation, the lower bound from the cutter width, the min-max
  objective, and one real competition instance with a solution.
- Look as in `docs/look/rasenmaehen.webp`: Scribble grid paper; uncut cells green with grass, mowed cells
  striped light green, holes (pond, tree, flower bed) from the Scribble tiles, cutters as red and purple
  tokens with numbers, their 3 × 3 footprint dashed, tours as coloured lines.

Acceptance: coverage and tour lengths agree with the pyutils27 verifier on test fixtures (generated once
with Python and committed; `pip install` works in the cloud sessions); two players can mow a lawn on one
laptop keyboard.

## Phase 5 (track B, optional): "Straßenbau" (MST) (target 31 Oct)

- Drag between villages to build a road, click a road to remove it; live total length and "+x % über dem
  Optimum". Unity MST levels plus random ones. Explanation: Kruskal animation.
- Look: villages from the Cartography Pack, roads as dashed ink lines (see the start map).

Acceptance: the MST check accepts every optimal tree.

## Phase 6: playtest and polish (target 4 Nov)

- Playtest with teenagers (not only student assistants) on the booth laptops with external mice; fix
  confusing texts and controls.
- Final art in place, `CREDITS.md` complete, credits screen in the app.
- Accessibility pass: contrast, colour never the only cue, readable fonts.

Acceptance: in the playtest, each game is understood within about 10 s and finished within 5 minutes;
no crash or stuck state in a 2-hour unattended run of the attract mode.

## Phase 7: freeze and booth preparation (4–6 Nov)

- Feature freeze and the tag `phase-7`; offline package for the booth laptops; a spare laptop.
- Start script that opens Chrome in kiosk mode on the local build; touchpad gestures, sleep and system
  updates switched off.
- QR-code poster with the GitHub Pages URL; Impressum and privacy notice reachable from the landing page.
- Cheat sheet for the booth staff: start, kiosk mode, staff menu, key test, fallback to the old version
  at `kbuchin.github.io/ruler/`.

Acceptance: the release runs offline on every booth laptop and the spare one from a cold start.

## Phase 8: after the open house (backlog)

- "Straßenbau" bonus "Kreuzungen erlaubt" (Steiner trees) with precomputed optima; t-spanner as
  "Umwege" (tap two villages to see the route and its detour factor).
- "Faire Teilung" (ham sandwich): two kinds of items with live counters and a line moved by two handles;
  three kinds with swaps as an expert mode; the dual view on demand.
- Dots & Polygons: port the rules from branch `MultiThreadedalfabeta` of `kbuchin/ruler` (see legacy
  notes), convex mode with 12–15 dots as the default, AIs (greedy, alpha-beta) in a worker.
- New games: "Feuerwachen" (k-center), "Fluchtweg" (shortest path in a polygon), later "Nachtwächter"
  (watchman route) and "Zwillingsdreiecke" (compatible triangulations).
- Optional anonymous play data with consent, as in tsp-boards, to find levels that are too hard.

# Roadmap

Source of truth for open work (see `CLAUDE.md`, "Working mode"). Work through the phases in order, record
decisions in the decision log of `docs/design-notes.md`, and mark items done here ("— done <date>").

Deadline: the booth at the TU Dortmund open house on **Saturday 7 November 2026**, run on laptops with
mouse and keyboard. Phases 0–7 are the booth edition; Phase 8 is the backlog for afterwards. Tags mark only
booth releases (`phase-6` the laptop test, `phase-7` the feature freeze, `phase-7.1`, `phase-7.2` … later
fixes; Kevin or Maike create them, see `docs/cloud-sessions.md`), so the booth can always fall back to
the last release.

After Phase 1, two tracks run in parallel, each in its own cloud session and branch:

- Track A: Phase 2 ("Erobere das Land"), then Phase 4 ("Rasenmähen").
- Track B: Phase 3 ("Gassi gehen"), then Phase 5 ("Straßenbau", optional).

If time runs short, drop Phase 5 first; the two research games and the playtest have priority.

Phones (Kevin, 2026-10-16): visitors open the QR code on their phones, so every game must be playable on a
phone in portrait, not only on the booth laptops. Pointer games use the screen well in portrait (e.g. a
wide board rotated by 90°) and keep touch targets at least 44 px; the keyboard games get on-screen
controls. Each game's Playwright smoke test plays a level in both projects (laptop 1280 × 800 and phone
390 × 844).

## Phase 0: foundation (target 20 Oct) — done 2026-10-16

- Scaffold the app at the repository root with the toolchain described in `CLAUDE.md` (Node ≥ 22.13,
  TypeScript `~6.0`); Prettier and ESLint ignores as in `CLAUDE.md`, then format the Markdown docs once;
  `npm run check` green; CI on GitHub Actions for pull requests and pushes to `main`, including a
  Playwright job that uploads screenshots as artifacts (if pushing workflow files is refused, see
  `CLAUDE.md`). — done 2026-10-16
- `.env.example` with the build variables `VITE_TSP_BOARDS_URL` and `VITE_STAFF_PIN`; the Pages
  workflow reads them from GitHub Actions repository variables. — done 2026-10-16
- GitHub Pages via Actions: a workflow builds `main` and deploys it to
  `ls11ae.github.io/ruler-of-the-plane/` (Vite `base`). Kevin switches Settings → Pages → Source to
  "GitHub Actions" once. The old site at `kbuchin.github.io/ruler/` stays untouched. — done 2026-10-16 (workflow ready; the first deployment follows the merge)
- Shell: start screen as in `docs/look/start-map.webp` (parchment map of the kingdom, one labelled place
  per game, places without a game yet shown dashed), German/English switch, fullscreen button, "Alte
  Ruinen" linking to `https://kbuchin.github.io/ruler/`, "Rundreise" linking to tsp-boards (build
  variable, hidden while unset). — done 2026-10-16
- Kiosk mode: after 90 s without input, return to an attract screen; a hidden staff menu (long press or
  a key combination, then the PIN from `VITE_STAFF_PIN`) resets leaderboards, enables or disables games, sets the difficulty and
  offers a key test (shows every key currently held, to find rollover limits of the laptop keyboard). — done 2026-10-16
- Input layer: Pointer Events for mouse, touchpad and touch; a keyboard module with key-state tracking by
  `KeyboardEvent.code` and fixed-rate repeat; optional Gamepad API. — done 2026-10-16
- Shared UI: SVG board component (fits the screen, ≥ 44 px hit targets), sketchy buttons and keycaps as
  in the mockup, "So geht's" overlay, result screen with a "Was steckt dahinter?" panel and a button for
  the game's theory view, local daily leaderboard with nicknames chosen from a list, "Mensch gegen
  Maschine" counter. — done 2026-10-16
- Assets: use the files in `assets/` (already in the repository: Kenney packs CC0, fonts OFL); start the
  per-file list in `CREDITS.md`. TU Dortmund / LS 11 logos are placeholders until provided. — done 2026-10-16
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
    to a fresh import. — done 2026-10-16

Acceptance: the shell runs on a laptop (mouse and keyboard) and on a phone and works offline after the
first load; all 37 Unity levels are available as JSON (14 art gallery, 4 + 4 + 3 Kings Taxes, 9 Divide,
3 convex hull); the Pages deployment serves the shell.

## Phase 1: "Licht ins Verlies" (art gallery) (target 23 Oct) — done 2026-10-16 (playtest items open)

- Click to place a torch, drag to move, drag off the dungeon to remove. — done 2026-10-16
- Visibility polygon for polygons with holes (own angular sweep on exact predicates). — done 2026-10-16
- Live "x % beleuchtet" while dragging; the unlit region is darkened (Clipper2 difference). — done
  2026-10-16; "fully lit" is judged by thickness (Kevin, see the decision log), with a pulsing dot at the
  thickest dark spot; tune the radius r = 0.03 in the playtest.
- Win as soon as everything is lit. Stars: at most k torches (the level's number) three, k + 1 two, more
  one; fewer than k is shown as a record. — done 2026-10-16
- Levels: the 14 Unity levels re-ordered by difficulty; levels with 12 or more torches go to an expert
  set. If a floor plan is available, add a TU Dortmund building as a level. — done 2026-10-16 (9 main
  levels, expert set with agLevel13_4 and the levels with k ≥ 12); no TU Dortmund floor plan (Kevin,
  2026-10-17).
- Explanation on hole-free levels (Unity levels 1, 3, 6, 8, 13): animation of Fisk's proof (triangulate,
  3-colour, take the smallest colour class). Theory view: visibility polygons and the triangulation. —
  done 2026-10-16 (levels with pillars show the computer's ray sweep instead).
- Phones in portrait: rotate a wide level by 90° when that makes it larger, torches at least 44 px, a
  torch dragged by touch is drawn above the finger, and a way to remove a torch when the dungeon fills
  the screen. The smoke test plays a level in both Playwright projects (laptop and phone). — done
  2026-10-16 (removal by dragging onto a bucket that appears while dragging).
- Look as in `docs/look/licht-ins-verlies.webp`: Scribble grid-paper floor clipped to the level, hatched
  rock outside and in pillars, sketchy SVG walls, props as decoration under the light, torches as yellow
  tokens with a flame, lit area warm, unlit area dark. Optional extra levels built from tiles as
  orthogonal polygons; without holes, ⌊n/4⌋ torches always suffice (Kahn, Klawe, Kleitman). — done
  2026-10-16, except the optional extra levels.

Acceptance: on every level, random torch placements are judged identically by the exact check and by a
fine raster check (up to the sliver tolerance in `CLAUDE.md`); dragging stays smooth on a booth laptop.
Status: the raster check passes on all 14 levels (with the thickness rule, checked pointwise); the
lighting takes at most 10 ms per drag frame on the largest level with 17 torches in the cloud session
(median 2 ms); check on a booth laptop in the playtest.

## Phase 2 (track A): "Erobere das Land" (Voronoi game) (target 27 Oct) — done 2026-10-16 (playtest items open)

- Maps with land and water, authored in IPE (define and document the convention, e.g. a layer for land
  polygons with lakes as holes, `square` markers for cities, `cross` markers for gold mines). At least
  three maps: island, river valley, lake district. — done 2026-10-16 (`levels/voronoi/README.md`)
- Rules: castles only on land; a minimum distance to every castle, shown as a circle while aiming; score
  = land area of a player's cells plus city and gold-mine bonuses. — done 2026-10-16 (rings of half the
  distance around every castle; castles also keep off the shore and the towns; agreed by Kevin 2026-10-17)
- Two players or against the computer, 5 or 10 castles each. Hovering shows a ghost castle with its
  future cell and the points it would gain; a click places it (touch: press and hold, release). — done
  2026-10-16
- AI in a worker: candidate positions on land with jitter, gain evaluated on a land raster. "Leicht"
  picks a random move among the good ones, "Schwer" the best move with one ply of look-ahead. Attract
  mode = AI vs. AI. — done 2026-10-16 (plus "Mittel"; the attract screen plays the demo behind its
  text)
- Look as in `docs/look/erobere-das-land.webp`: Cartography Pack on parchment, coast with offset ink
  lines, castles with a pennant and base in the player colour, towns and a mine with bonus badges,
  territories as colour washes, dashed cell borders. — done 2026-10-16
- Theory view: Voronoi diagram, Delaunay triangulation and empty circumcircles as buttons; heatmap of
  the gain of the next move (the AI's evaluation). — done 2026-10-16

Acceptance: an AI move takes under 200 ms on a booth laptop; "Schwer" beats "Leicht" in at least 70 % of
AI-vs-AI games; raster and exact scores differ by less than 1 % of the land area.
Status: in a cloud session the slowest "Schwer" move takes about 50 ms (the unit test only logs it and
fails above 1 s, since wall-clock time depends on the machine), "Schwer" beat "Leicht" in 104 of 120 games
(a test plays 12), and raster and exact land differ by less than 1 point of 100 in the tests. The 200 ms
target is measured on a booth laptop in the playtest (Phase 6).

## Phase 3 (track B): "Gassi gehen" (Fréchet distance) (target 29 Oct) — done 2026-10-16 (booth key test open)

- Two paths through the castle park; person and dog each move only forward along their own path while
  their key is held (person `KeyA`, dog `KeyL`; two players or one player with two hands), at the same
  speed. The leash is drawn and turns orange-red when nearly taut; exceeding the length limit L fails the
  level; levels lower L towards the Fréchet distance. — done 2026-10-16 (six walks, leash from 1.6 down
  to 1.08 times the Fréchet distance; a dead end is shown at once, and a hint says who should walk).
- On-screen controls for phones: two large hold buttons, "Mensch" (left) and "Hund" (right), which act
  like the keys while pressed (multi-touch: both at once); a phone smoke test plays a level with them. —
  done 2026-10-16
- Solo mode "Schätz die Leine": pick a length with a slider; the computer shows whether a walk exists. —
  done 2026-10-16 (it walks the walk, or walks until the leash gets too taut)
- Theory view (panel beside the park, as in `docs/look/gassi-gehen.webp`): free-space diagram
  (x = person's position, y = dog's position, light = leash long enough) with an ε slider; the player's
  walk and the optimal monotone walk drawn as curves; hovering a point of the diagram shows the matching
  positions and leash on the map; critical values marked; a sandbox to draw one's own paths. — done
  2026-10-16 (critical values where a passage opens at a corner as ticks on the slider, with buttons to
  step through them; the narrowest spot of the computer's walk marked)
- Look: park from the Cartography Pack, the person's path as a footpath (walked part darker), the dog's
  trail dotted (walked part solid), person = green Scribble token, dog = `animal-pack-remastered`
  `dog.png`. — done 2026-10-16
- Core: Fréchet decision and distance for polylines with up to 20 segments, property-tested against the
  discrete Fréchet distance on densely sampled curves. — done 2026-10-16
- Bonus set "Im Wald" (homotopic Fréchet distance): trees whose trunks catch the leash like a taut
  rope; four walks where timing decides how the leash lies; targets from an offline search over
  (person's position, dog's position, leash class), stored with the walks and tested against the
  rope update. — done 2026-10-17 (theory view and explanation agreed by Kevin 2026-10-17)
- Harder tiers (Kevin, 2026-10-17: the walks are too easy): the walks so far are "Leicht"; "Mittel"
  and "Schwer" are generated offline with a fixed seed and kept only if hard (every simple strategy of a
  visitor snaps the leash, a careful player gets through at a slower walking speed; ranked by dead ends
  and the complexity of the free space), in the park and in the woods, where the trees must also make
  the shortest leash clearly longer and catch the computer's best walk without trees. A table of every
  walk's numbers for Kevin in `docs/gassi-walks.md`. — done 2026-10-17 (tiers, the measure of hard and
  the generator agreed by Kevin 2026-10-18)

Acceptance: correct decisions on random curves; two people can play it on one laptop keyboard (checked
with the key test on the booth laptops); a level can be finished on a phone with the hold buttons.
Status: decisions and distances agree with the discrete Fréchet distance on random curves (and on ties);
every walk can be finished at 60 frames per second by following the hint (unit test); the smoke test
walks the first walk with the keys (laptop) and with both hold buttons at once (phone). Open: A + L on
the booth laptops' keyboards (key test in the staff menu).

## Phase 4 (track A): "Rasenmähen" (CG:SHOP 2027 lawn mowing) (target 31 Oct) — done 2026-10-16, solver targets 2026-10-17 (playtest open)

- Read instances and solutions in the pyutils27 JSON formats; booth lawns are small polyominoes with
  holes (300–500 cells) and a 3 × 3 cutter; 1 or 2 cutters. — lawns designed 2026-10-16 (five lawns,
  `levels/lawn-mowing/`). Reading and import done 2026-10-16. Solutions done 2026-10-17: an offline
  solver in `scripts/lawns/` (simple strategies, large neighbourhood search with CP-SAT, lower bounds)
  wrote the ten solutions to `levels/lawn-mowing/solutions/`; the table of `levels/lawn-mowing/README.md`
  compares them with the lower bounds and the best simple strategy (no lawn is boring).
- Controls: cutter 1 with WASD, cutter 2 with the arrow keys; holding a key moves one lattice step at a
  fixed rate. Cutters may leave the lawn and cross holes (holes need no mowing). A "Feierabend" key
  (space) drives every cutter back to its start on the shortest (L1) way and closes the tour. — done
  2026-10-16
- On-screen controls for phones: a direction pad for one cutter (holding a direction repeats at the same
  fixed rate as the keys) plus a "Feierabend" button; on phones the lawns are played with one cutter. A
  phone smoke test mows a lawn with them. — done 2026-10-16
- Live display: mowed share, steps per cutter, the longest tour (the score), and the target from the
  chair's solver for this lawn (stored with the level; shown as a placeholder until provided). — done
  2026-10-16 (the solver's targets since 2026-10-17)
- Theory view: the solver's tours as an animation, the lower bound from the cutter width, the min-max
  objective, and one real competition instance with a solution. — done 2026-10-16 (the solver's tours
  since 2026-10-17)
- Look as in `docs/look/rasenmaehen.webp`: Scribble grid paper; uncut cells green with grass, mowed cells
  striped light green, holes (pond, tree, flower bed) from the Scribble tiles, cutters as red and purple
  tokens with numbers, their 3 × 3 footprint dashed, tours as coloured lines. — done 2026-10-16 (since
  2026-10-19 every hole is stone slabs, uncut grass darker; see Phase 6, "Kevin's playtest")

Acceptance: coverage and tour lengths agree with the pyutils27 verifier on test fixtures (generated once
with Python and committed; `pip install` works in the cloud sessions); two players can mow a lawn on one
laptop keyboard; one player can mow a lawn on a phone with the direction pad.
Status: coverage and lengths agree with the pyutils27 verifier on the fixtures (three booth lawns and a
competition instance, 25 tours); the smoke tests mow lawn 1 with two players on the laptop keyboard and
with the direction pad on a phone; check the key pairs with the key test on the booth laptops.

## Phase 5 (track B, optional): "Straßenbau" (MST) (target 31 Oct) — done 2026-10-16

- Drag between villages to build a road, click a road to remove it; live total length and "+x % über dem
  Optimum". Unity MST levels plus random ones. Explanation: Kruskal animation. — done 2026-10-16 (also
  two taps to build on phones; the four Unity MST maps, then the larger Unity spanner and TSP point sets,
  then random villages; hints; a theory panel that runs Kruskal step by step on the map)
- Look: villages from the Cartography Pack, roads as dashed ink lines (see the start map). — done
  2026-10-16

Acceptance: the MST check accepts every optimal tree. Status: checked by brute force on a grid with many
equal lengths (every optimal spanning tree accepted, every longer one rejected); Kruskal against brute
force for up to 8 villages; following the hints from a random tangle of roads always ends optimal.

## Phase 6: playtest and polish (target 4 Nov)

- Playtest with teenagers (not only student assistants) on the booth laptops with external mice; fix
  confusing texts and controls.
- Browsers: the booth laptops run Windows with Chrome or Firefox, visitors' phones Safari (WebKit),
  Chrome or Firefox, and so far every test runs in Chromium. Add Firefox and WebKit projects to the
  Playwright smoke tests in CI (laptop and phone each; CI installs the browsers) and fix what fails. —
  done 2026-10-18 (every smoke test passes in Chromium, Firefox and WebKit, laptop and phone; fixes: the
  safe area on iPhones, the drawing speed, test time limits; see the decision log, "Browsers and
  performance")
- Performance on weak laptops: frame times of the heaviest scenes under Chromium's CPU throttling (4× and
  6×) and the time of a "Schwer" move, fix what is under 30 frames per second or over 200 ms. — done
  2026-10-18 (`e2e/bench.spec.ts`, numbers in `docs/performance.md`: every scene at least 36 frames per
  second at 6× without a GPU, the woods walk with six posts, the others at least 47; static art in layers
  of its own, the header's forced layout gone, "Schwer" about 2.5 times faster)
- First visit on a phone via the QR code: time to the start map on Slow 3G, lazy loading, a reasonable
  precache. — done 2026-10-18 (start map complete after 11.3 instead of 27.5 s, precache 1.25 instead of
  2.0 MB, by a WebP parchment and WOFF2 fonts)
- Measure on each booth laptop: a "Schwer" move of "Erobere das Land" takes under 200 ms (Phase 2
  acceptance). Play against "Schwer" with 10 castles each and open the theory view: it shows the
  computing time of the computer's last move; the first moves are the slowest. If it is over 200 ms,
  lower `LOOKAHEAD` in `src/core/games/voronoi/ai.ts` or raise `RASTER_STEP` in `raster.ts`. Stand-in
  measured 2026-10-18: the first move takes about 135 ms on a laptop four times slower than the cloud
  session (34 ms there), the others under 70 ms (`docs/performance.md`); the booth laptops are still to
  check.
- Final art in place, `CREDITS.md` complete, credits screen in the app. — credits screen and the `CREDITS.md`
  check done 2026-10-17 (`#/credits`, "Mitwirkende" on the start map, with every licence text); the TU
  Dortmund / LS 11 logos are still placeholders.
- "Rundreise" (Kevin): tsp-boards is online and `VITE_TSP_BOARDS_URL` is set; tests independent of the
  build variables, a new tab outside kiosk mode, tsp-boards' event mode in a frame in kiosk mode (input
  there keeps the kiosk timeout away; its workers and its full-screen button work in the frame). — done
  2026-10-17
- "Licht ins Verlies" (Kevin): name the stronger bound ⌊n/4⌋ (Kahn, Klawe, Kleitman) for dungeons with
  only right angles and no pillars, in the theory view and the explanation. — done 2026-10-17 (only
  agLevel3_2 qualifies)
- Accessibility pass: contrast, colour never the only cue, readable fonts. — done 2026-10-17 (`e2e/a11y.spec.ts`: axe-core
  plus own checks of contrast against the drawn background, text sizes and 44 px hit targets on every
  screen; see the decision log, Phase 6).
- "Straßenbau" is too easy (Kevin's playtest): two harder sets after the current maps, "Kreuzungen"
  (Steiner tree: junctions placed by hand, angles shown, within 1 % of the stored optimum counts; since
  2026-10-20 the optimum's shape with every angle within 5° of 120°) and
  "Zwei Sorten" (castles and villages, every road joins one of each, no two roads cross), each map with
  its exact optimum computed offline. — done 2026-10-17 (six maps each; `scripts/roads/`, see the
  decision log, Phase 6)
- "Rasenmähen" (Kevin's playtest): a step back per mower (a key per mower on the laptop, the middle of
  the direction pad on phones). — done 2026-10-17
- Difficulty at game start (Kevin's playtest: he did not find the harder sets of "Straßenbau"): every
  game opens on a tier screen with the rules and "Leicht", "Mittel", "Schwer" (a teaser and the stars so
  far each, "Weiterspielen" when there is progress), one click from the start map to playing; the last
  tier per game remembered on the device (cleared by the kiosk reset), a suggested tier per game in the
  staff menu, "Weiter mit „Mittel“" after a tier's last level, the pickers in the same three sections.
  — done 2026-10-17 (the tier mapping agreed by Kevin 2026-10-18, see the decision log, Phase 6)
- Attract demos for all five games, shown in turn (about 20–30 s each, with the game's name and "Komm
  spielen!"), only precomputed solutions; the soak test checks all five. — done 2026-10-17
- "Gassi gehen" (Kevin, after playing the harder tiers: the leash must really wind round trees, and
  the park and the woods should feel alive): thin posts the leash coils round several times (drawn as
  a spiral with a "2×" badge); new easy woods walks where winding is the point ("Laternenpfahl", "Vor
  dem Bäcker" with a wound start, "Achterbahn"); a camera that follows person and dog with an overview
  map; a leash drawn with its real length that trembles when taut and snaps visibly; the free start
  leash as an expert puzzle on two "Schwer" woods walks (choose how the leash lies round the gate post;
  bar chart of the shortest leash per start); "Mittel" and "Schwer" woods walks regenerated with 3–8
  trees and posts each; "Kürzere Leine" after a finished walk. — done 2026-10-18 (all agreed by Kevin
  2026-10-18, see the decision log, "Winding in the woods")
- "Gassi gehen" (Kevin, 2026-10-18): one more "Schwer" woods walk where the free start is a real
  trade-off: several start windings work, with clearly different shortest leashes; the best is not the
  straight one, the straight one needs at least 15 % more, a third at most 1.5 times the best. — done
  2026-10-18: "Schlossrunde", a round from the castle about a post beside the castle gate (a walk from
  the gate to the castle cannot have two good starts; the round is proposed): best 3.45 m with the
  leash wound twice, straight 4.72 m (+37 %), wound once 3.92 m (+14 %), three times 4.22 m (+22 %)
  (`scripts/gassi/tradeoff.ts`; see the decision log, "Kevin's review").
- Kevin's playtest of `main` at `8f4d3e2` (2026-10-19, all agreed by Kevin; see the decision log,
  "Kevin's playtest"):
  - "Straßenbau", "Kreuzungen": a new first map, unlike the how-to's picture (a castle above two
    villages at one junction was map 1 with its solution). — done 2026-10-19: "Gabel", a fork with one
    junction and a road straight on (`scripts/roads/steiner-maps.ts`).
  - "Kreuzungen": junctions settle on a win only very close to the optimum; between that and 1 % the
    network counts but the junctions stay put. — done 2026-10-19: 0.03 %, tuned on the six maps (angles
    typically 4–5° from 120°; at 0.2 % they could still be 10–20° off). (Replaced on 2026-10-20, see below.)
  - "Licht ins Verlies": the marker on the thickest dark spot only from 95 % lit on. — done 2026-10-19
    (the attract demo keeps it).
  - "Licht ins Verlies": rock around the dungeon and in the pillars, somewhat darker; "Mittel" starts
    with small pillars. — done 2026-10-19: groups of short ink strokes on stone; "Mittel" starts with
    agLevel4_8, the corridors round large pillars come last.
  - "Rasenmähen": a button "↶ Zurück" with its key on each mower's card. — done 2026-10-19 (the key
    label of Backspace is now "Rücktaste" everywhere).
  - "Rasenmähen": the explanation plays a generic example lawn, not the level's solution. — done
    2026-10-19: `levels/lawn-mowing/example/`, tours for one and two mowers from the offline solver.
  - "Rasenmähen": every hole is stone slabs, which a mower obviously drives over. — done 2026-10-19 (also
    in the how-to, theory, explanation, attract demo; "Gemüsegarten" and "Obstwiese" renamed "Gartenwege"
    and "Trittsteine").
  - "Erobere das Land": the castle count on phones. — done 2026-10-19 ("Du bist dran · Burg 3 von 10").
  - "Rasenmähen": "Bisher" / "Längerer Mäher" and "Computer: 110 Schritte" on the score card. — done
    2026-10-19.
  - "Rasenmähen": mowed and uncut grass clearly different in colour. — done 2026-10-19.
- Kevin's playtest of 2026-10-20, "Straßenbau" and "Rasenmähen" (all agreed by Kevin; see the decision
  log, "Kevin's playtest (2026-10-20)"):
  - "Straßenbau", bug: equally short networks refused by the rounding of the coordinates (map 6 of "Von
    Ort zu Ort", "+0,1 %"). — done 2026-10-20: lengths equal up to a relative 1e-6; checked on every set
    and on 3,000 random maps.
  - "Straßenbau": up to 0.5 % longer counts in "Von Ort zu Ort" and "Zwei Sorten", and the result says
    how much longer it is. — done 2026-10-20.
  - "Kreuzungen": a road from a junction by clicking it, then a place or junction, said in the hint line
    and "So geht's", and a dashed line from the selected node to the mouse pointer. — done 2026-10-20.
  - "Rasenmähen": the mower may hang over the edge, said in the rules and shown in the how-to animation
    (its lawn one row higher than two strips). — done 2026-10-20.
  - "Kreuzungen": solved when the network has the optimum's shape and every angle is within 5° of 120°;
    then the junctions settle and only then "Optimal!" (replaces the 1 % win and the 0.03 % settling). —
    done 2026-10-20 (5° to be tuned in the playtest, also with a finger on a phone).

Acceptance: in the playtest, each game is understood within about 10 s and finished within 5 minutes;
no crash or stuck state in a 2-hour unattended run of the attract mode.
Status (2026-10-17): the 2-hour run passed as a simulation (`e2e/soak.spec.ts`, a fake clock 8 times
faster than real time, the computer's moves in real time): 4,925 moves of the attract demo, 17 visitors
who opened every place in turn (the five games, the credits, "Rundreise" with a real tsp-boards build) and
walked away, the attract screen back 90 s later each time, no page error, and memory flat after the first
round of visits (JavaScript heap 7.0–7.2 MB from minute 60 on, about 1,600 DOM nodes). CI runs the same
test for 15 simulated minutes. Again with the tier screens and the five demos in turn (2026-10-17): 120
simulated minutes, 4,307 changes of the demos, all five shown, 17 visitors (each picking a tier), no
page error; JavaScript heap 7.3–7.9 MB from minute 30 on, 670–1,750 DOM nodes. Open: the playtest and
the measurements on the booth laptops; a real 2-hour run on a booth laptop in Phase 7 (sleep, updates
and the browser itself are not simulated).

## Phase 7: freeze and booth preparation (4–6 Nov)

Prepared without the booth laptops on 2026-10-17 (see the decision log, Phase 7); what is left needs the
laptops, Kevin or the tag.

- Feature freeze and the tag `phase-7`; offline package for the booth laptops; a spare laptop. The package
  serves tsp-boards' build at `/tsp-boards/` next to the app on the same local server, and the app is
  built with `VITE_TSP_BOARDS_URL=/tsp-boards/`, so "Rundreise" works offline in its kiosk frame (see the
  decision log, Phase 6). — package done 2026-10-17: the workflow "Booth package" (`booth.yml`, by hand,
  for `phase-*` tags and for changes of the package) builds it with tsp-boards downloaded from its site
  and a PowerShell server, tests it on Windows (PowerShell 5.1, Chrome, Firefox) and Ubuntu (played
  offline in Chromium and Firefox), and attaches `Stand-<tag>.zip` to the release of the tag
  (`booth/README.md`). Open: the freeze, the tag, the spare laptop.
- Start script for the Windows booth laptops that opens Chrome in kiosk mode on the local build;
  touchpad gestures, sleep and system updates switched off. — done 2026-10-17: `Start-Stand.cmd` (Chrome
  kiosk with its own profile, Firefox and Edge as fallbacks, a watchdog that reopens a closed browser,
  screen kept awake, display/sleep/hibernate timeouts and the screen saver off and restored by
  `Stop-Stand.cmd`, without admin rights); touchpad gestures, notifications and pausing Windows Update need
  the Settings app and are in the checklist.
- The Impressum and privacy notice of the Algorithm Engineering Group (`https://ae.cs.tu-dortmund.de/`,
  Kevin) reachable from the landing page. — done 2026-10-17: "Impressum · Datenschutz" on the start map
  with the Impressum, the privacy notice and the accessibility statement, as addresses with QR codes in
  kiosk mode (agreed by Kevin 2026-10-18). No QR poster or card of our own: the print material of
  tsp-boards covers Ruler of the Plane (Kevin, 2026-10-18; the poster A2, the card A6 and the A4 sheet of
  cards made on 2026-10-17 were removed).
- Cheat sheet for the booth staff: start, kiosk mode, staff menu, key test, fallback to the old version
  at `kbuchin.github.io/ruler/`. — done 2026-10-17: `docs/booth/spickzettel.md`, one A4 page as
  `Spickzettel.pdf` in `docs/booth/` and in the package.
- Texts for Kevin to proofread: every German text with its key and example values, and screenshots of
  every screen at 1280 × 800. — done 2026-10-17: `docs/texts-de.md` (`npm run texts`, kept fresh by a
  test) and the artifact `texte-screenshots` of the workflow "Texts". Open: Kevin's corrections.
- Checklist for the first test on the booth laptops (the acceptance below, the real 2-hour run, key test,
  mouse, sleep and updates). — done 2026-10-17: `docs/booth/checkliste-laptoptest.md` (also as PDF in the
  package). Open: running it on every booth laptop and the spare one.

Acceptance: the release runs offline on every booth laptop and the spare one from a cold start.

## Phase 8: after the open house (backlog)

- "Straßenbau": t-spanner as "Umwege" (tap two villages to see the route and its detour factor). (The
  Steiner trees came in Phase 6 as the set "Kreuzungen".)
- "Faire Teilung" (ham sandwich): two kinds of items with live counters and a line moved by two handles;
  three kinds with swaps as an expert mode; the dual view on demand.
- Dots & Polygons: port the rules from branch `MultiThreadedalfabeta` of `kbuchin/ruler` (see legacy
  notes), convex mode with 12–15 dots as the default, AIs (greedy, alpha-beta) in a worker.
- New games: "Feuerwachen" (k-center), "Fluchtweg" (shortest path in a polygon), later "Nachtwächter"
  (watchman route) and "Zwillingsdreiecke" (compatible triangulations).
- Optional anonymous play data with consent, as in tsp-boards, to find levels that are too hard.

# Design notes

## 1. Goal

A booth edition of Ruler of the Plane for the TU Dortmund open house on 7 November 2026, run on laptops
with mouse and keyboard: four games ("Licht ins Verlies", "Erobere das Land", "Gassi gehen",
"Rasenmähen"), optionally "Straßenbau", plus a link to tsp-boards. Each game is understood in ten
seconds, played in two to five minutes, and ends with "how the computer does it"; a theory view goes
deeper for curious visitors. Afterwards the same app is the public, playable-at-home version.

## 2. Why a rewrite instead of a Unity upgrade

- The Unity project (2018.2) would need several upgrade steps to Unity 6.3 LTS. The Built-in Render
  Pipeline is deprecated from Unity 6.5 but supported until at least the end of 2028, so a move to URP
  would follow later, not immediately.
- Scenes and prefabs are YAML with GUIDs and much work happens in the editor, which coding agents handle
  badly; tests need a Unity licence in batch mode.
- Each game's logic is small (controllers of 100–350 lines); the hard part is geometry, which mature
  JavaScript libraries cover with exact predicates and integer clipping. (Clipper2 exists for C# too, so
  the robustness argument alone would not force a rewrite.)
- tsp-boards already uses the target stack; sharing it keeps tooling, conventions and know-how in one place.
- Risk of the rewrite: all geometry is new code within about three weeks. Mitigation: a tagged, working
  state after every phase; the Unity builds stay available at `kbuchin.github.io/ruler/` as the last
  fallback.

## 3. Art and licences

- All art comes from Kenney packs (CC0), committed in `assets/kenney/`: Cartography Pack (parchment maps:
  start screen, "Erobere das Land", "Straßenbau", the park in "Gassi gehen"), Scribble Dungeons (top-down
  grid paper: "Licht ins Verlies", "Rasenmähen", tokens), Animal Pack Remastered (the dog). The target
  look is in `docs/look/`.
- Fonts (OFL, in `assets/fonts/`): Eagle Lake for titles, Patrick Hand for text. Key glyphs are CSS
  keycaps, so the Input Prompts pack is not needed.
- The art gallery levels are not grid polygons, so the Scribble floor is used as a pattern clipped to the
  level and walls are drawn as sketchy SVG strokes.
- The existing TU/e art (Willem Sonke, Thom Castermans) has no licence file and is not used. With a
  release under CC BY 4.0 it could return later as a second visual theme.
- Other licences: CC BY (e.g. game-icons.net) is fine with credits; avoid NC and ND; CC BY-SA (e.g.
  OpenMoji) only after asking Kevin, since adaptations must be shared alike.

## 4. Open questions (for Kevin)

- Booth laptops: operating system, browser, external mice; key test on each keyboard.
- Solutions of the chair's CG:SHOP solver for the small booth lawns (targets and animations).
- Where tsp-boards is published (it is private and not deployed yet).
- Whether a floor plan of a TU Dortmund building can be used as a level.
- Who is responsible for the Impressum and privacy notice of the public site.

## 5. Decision log

Short entries: decision; alternatives considered; reason. Newest last. Entries marked "proposed" need
Kevin's confirmation. From Phase 2 on, the parallel tracks add their entries at the end of their own
subsection below, so their branches do not conflict.

- **2026-10-14 Web rewrite in `web/` of `kbuchin/ruler`, Unity code kept as reference** (agreed by Kevin
  2026-10-16; superseded the same day by the new repository below). Alternatives: upgrade to Unity 6;
  new repository under `ls11ae`. Reason: section 2; the repository would have kept the GitHub Pages URL.
- **2026-10-14 Stack as in tsp-boards** (TypeScript, React, Vite, Vitest, zustand, own i18n; agreed
  2026-10-16). Alternatives: PixiJS, Phaser, Svelte. Reason: one toolchain for the chair's web projects;
  SVG suffices for a few hundred shapes per scene.
- **2026-10-14 TSP via tsp-boards** (agreed 2026-10-16). Alternative: port the Kings Taxes TSP mode.
  Reason: tsp-boards has exact optima, curated puzzles and a play mode already.
- **2026-10-14 Coverage test for the art gallery with Clipper2** (difference on integer coordinates,
  tiny slivers ignored; agreed 2026-10-16). Alternative: area ratio with tolerance as in Unity. Reason:
  the Unity check misjudged near-degenerate cases and needed checkpoints.
- **2026-10-16 Booth hardware = laptops with mouse and keyboard** (Kevin). Touch is a bonus. Two-player
  games share one keyboard, one key per player at a time; gamepads optional.
- **2026-10-16 New game "Rasenmähen" based on CG:SHOP 2027** (Kevin's idea). Rules and file formats as in
  pyutils27, scaled down for the booth; two cutters steered with WASD and arrow keys.
- **2026-10-16 "Gassi gehen" gets a theory view** (Kevin): free-space diagram with ε slider, walks as
  curves, critical values.
- **2026-10-16 "Erobere das Land" with land, water, cities and a minimum distance** (Kevin). The AI
  evaluates moves on a land raster.
- **2026-10-16 (proposed) "Straßenbau" optional for November**; the two research games have priority.
  Two parallel tracks after Phase 1.
- **2026-10-16 Art from Kenney (CC0)** (Kevin's suggestion): Cartography Pack, Scribble Dungeons (true
  top-down view for the art gallery), Animal Pack Remastered (the dog). Alternatives: the TU/e art
  (licence unclear, author busy), commissioned drawings (too slow for November), Cube Pets (3D models,
  would need top-down renders). Reason: available now, consistent ink look, no licence risk.
- **2026-10-16 New repository `ls11ae/ruler-of-the-plane`, public, MIT** (Kevin). Alternatives: `web/` in
  `kbuchin/ruler`; a personal repository. Reason: the web edition shares no code or art with the Unity
  version, only 37 level files and texts (copied to `legacy/`); the old site and repository stay
  untouched (no Pages migration in Phase 0); a clean licence from the start; the project sits with the
  chair next to tsp-boards.
- **2026-10-16 Work in Claude Code on the web, sessions started by `mbuchin`** (Kevin). Consequences:
  one session per phase or track, on its own branch, ending with a report from which the person creates
  the pull request; the person merges, checks the site and tags phases; Node ≥ 22.13 as in the cloud
  image; all art and fonts committed because kenney.nl and font CDNs are unreachable from cloud
  sessions; Playwright runs in CI only; a SessionStart hook installs the npm dependencies; per-game i18n
  files, credits sections and decision-log subsections keep the parallel tracks out of each other's
  files.
- **2026-10-16 Fonts Eagle Lake (titles) and Patrick Hand (text), both OFL and self-hosted; keycaps drawn
  in CSS.** Alternatives: system fonts; Kenney Input Prompts for key glyphs. Reason: the hand-drawn text
  matches the ink style (see `docs/look/`); no third-party requests.
- **2026-10-16 Style mockup as the visual target** (`docs/look/`, five screens at 1280 × 800). Numbers
  in it are sample values; "[Wert]" marks the solver target that is still missing.

- **2026-10-16 Toolchain versions (Phase 0).** TypeScript 6.0.3, React 19.3, Vite 8.3, Vitest 5.0, ESLint
  10.12 with typescript-eslint 8.71, Prettier 3.9, zustand 5. jsdom is pinned to 29, the newest version
  that supports Node 22.13 (jsdom 30 needs 22.22.2). Strict TypeScript with `noUncheckedIndexedAccess`;
  a third tsconfig checks `src/core/` without DOM types, so core code cannot use the DOM by accident.
- **2026-10-16 Playwright also runs in cloud sessions.** The cloud image does ship a Chromium
  (`/opt/pw-browsers/chromium`, older than the one Playwright 1.64 expects); `playwright.config.ts` uses
  it when present outside CI. CI installs the matching browser. Alternative: CI only. Reason: the
  session can look at its own screenshots before pushing.
- **2026-10-16 Level JSON format** (`src/core/levels/schema.ts`): one file per level at
  `public/levels/<collection>/<name>.json` plus `index.json` with the ids in Unity order; points as
  `[x, y]` pairs (compact, the format of d3-delaunay); y points down (SVG); coordinates rounded to 6
  decimals for readable diffs; art gallery outer boundary with positive shoelace area, holes negative.
  Collections are keyed by folder (`kings-taxes/mst`, `…/spanner`, `…/tsp`). Alternatives: one file per
  game; `{x, y}` objects. Reason: small diffs when a level changes, direct use with the geometry
  libraries.
- **2026-10-16 Level size per game as in Unity.** IPE levels are centred and scaled so the larger side
  of the bounding box is 9 (art gallery), 6 (Kings Taxes, convex hull) or 5 (Divide) units, the sizes
  the Unity importer used; the five `.asset` levels are already in those units and are only mirrored
  (Unity's y also points up). Alternative: one size for all games. Reason: the hand-made `.asset`
  levels then fit with the IPE levels of the same game (`hullLevel2` spans exactly 6); every board
  scales to the screen anyway.
- **2026-10-16 IPE reader**: fast-xml-parser (dev dependency only); paths with `m`/`l`/`h` only (other
  operators such as curves fail with a clear message, so new levels drawn in IPE must use polylines);
  markers by symbol name (`mark/disk` etc.); matrices of paths, markers and groups are composed.

- **2026-10-16 Games are discovered, not registered.** A game is the folder `src/ui/games/<id>/` with an
  `index.tsx` that default-exports its screen; `import.meta.glob` finds it at build time, the start map
  then shows its place as open, and the game is a separate chunk. Alternative: a shared registry array.
  Reason: the parallel tracks never edit the same file to add a game (see `docs/architecture.md`).
- **2026-10-16 Hash routes** (`#/`, `#/play/<id>`, `#/demo`). Alternative: history routes. Reason: GitHub
  Pages and a local booth build serve them without rewrites; the service worker needs no fallback rules.
- **2026-10-16 Start map in two layouts**: landscape (1280 × 800, as the mockup) for laptops and a
  portrait island (800 × 1600) for phones, chosen by aspect ratio; place labels are HTML buttons over
  the SVG art, sized in container query units. Alternatives: one layout scaled down (unreadable on
  phones); labels as SVG text (no automatic width, worse accessibility). Places of games not built yet
  are dashed with "Kommt bald"; games switched off by the staff are dashed with "Heute geschlossen".
  The external places ("Alte Ruinen", "Rundreise") are dashed as in the mockup but keep full ink, open
  in the same tab, and "Rundreise" is hidden while `VITE_TSP_BOARDS_URL` is empty.
- **2026-10-16 Kiosk mode is opt-in**: `?kiosk` in the URL (for the booth start script) or the staff
  menu turns it on and it stays on for that browser; the app then starts on the attract screen and
  returns there after 90 s without input, with the language reset to German and the staff menu closed.
  Alternative: always on. Reason: players at home should not be thrown out while reading the theory.
- **2026-10-16 Staff menu access**: a 3 s press on the compass rose of the start map (mouse, touchpad,
  touch) or Ctrl+Shift+S, then the PIN. An empty `VITE_STAFF_PIN` opens the menu without a PIN (the
  menu says so). Alternatives: a hidden URL (visitors could read it off the screen), a key sequence.
- **2026-10-16 Leaderboards**: per board key (`<game>/<level>`), today's top 10 in local time, older days
  dropped; names chosen from 32 fixed nicknames (German and English, e.g. "Kluge Eule"), stored by id so
  they follow the language switch; the "Mensch gegen Maschine" tally also restarts every day. All in
  `localStorage` of the device. Alternative: free text names (needs moderation at a public booth).
- **2026-10-16 Key test** in the staff menu: a drawn laptop keyboard lights up the held keys (labels from
  `navigator.keyboard` where available, so a QWERTZ keyboard shows Z and Y correctly), the most keys
  seen at once, and a checklist of the key pairs the games need together (A + L, WASD with arrows).
- **2026-10-16 Offline via vite-plugin-pwa** (Workbox, `generateSW`): the whole build including every
  level JSON is precached; a new service worker takes over at once (`skipWaiting`, `clientsClaim`) and
  the error boundary's way back reloads the page, in case an updated deployment removed an old game
  chunk. (Updates changed in Phase 3, see "Updates wait for the start map" under track B.) Manifest with `display: fullscreen`; the app icon is a compass rose drawn for this repository.
  Alternative: a hand-written service worker. Reason: the plugin knows the hashed file names.
- **2026-10-16 English names of the places** (shown with the language switch): "Light the Dungeon",
  "Conquer the Land", "Walk the Dog", "Mow the Lawn", "Road Works", "Old Ruins", "Round Trip". The map
  subtitle reads "Hands-on geometry – pick a place on the map".
- **2026-10-16 Logo placeholder**: the text "TU Dortmund · Informatik · LS 11" at the bottom of the start
  map until the logos are provided.

- **2026-10-16 Every game playable on a phone in portrait** (Kevin). Visitors open the QR code on their
  phones, so the laptops stay the booth hardware but phones are no longer only a bonus. Pointer games use
  portrait screens well (e.g. a wide board rotated by 90°), with touch targets of at least 44 px; the
  keyboard games get on-screen controls: two large hold buttons for person and dog in "Gassi gehen"
  (Phase 3), a direction pad for one cutter plus a "Feierabend" button in "Rasenmähen" (Phase 4). Each
  game's Playwright smoke test plays a level in the laptop and the phone project. Alternative: phones
  only for the start map and the explanations. Reason: most visitors who scan the QR code will play at
  home on a phone.

- **2026-10-16 "Fully lit" by thickness, not by area** (Kevin). Torches keep exact point visibility; the
  floor counts as lit when the dark region, shrunk by r = 0.03 level units (Clipper2 offset with −r),
  is empty, i.e. no dark spot is thicker than 0.06 units (4–6 px on the laptop). The remaining
  hairlines are drawn lit and the display shows 100 %. While the floor is not fully lit, a pulsing dot
  marks the thickest dark spot (the 2020 version added such a feedback point after its user study).
  Alternatives: the strict 1e-6 area tolerance (a torch a pixel away from a perfect spot leaves
  hairlines, so the game sticks at 99 %); a 0.2 % area tolerance (also accepts a compact dark spot of
  about 25 × 25 px, close to the size of real niches: the smallest niches of agLevel8_4 are 0.29 % of
  the floor); a torch as a small disc (changes the model). Tune r in the playtest. Measured on
  agLevel3_2: Kevin's torches at (2.35, −2.79) and (1.37, 1.83) stay fully lit even under the strict
  rule when each is moved by up to 0.05 units, so the levels have slack when torches are placed well.
- **2026-10-16 Art gallery level order** (Kevin for agLevel13_4): 9 main levels by k and complexity
  (agLevel3_2, 1_3, 6_3, 2_3, 10_4, 8_4, 5_5, 12_7, 4_8) and an expert set: the spike box agLevel13_4
  (spike boxes were the least liked puzzles in the 2020 user study) and the levels with 12 or more
  torches (9_12, 7_13, 11_14, 14_17).

- **2026-10-16 "Licht ins Verlies" interaction.** A click or tap places a torch, a drag moves it;
  dropping it off the dungeon or on a bucket that appears while dragging removes it (phones: the
  dungeon may fill the screen). A torch dragged by touch floats 64 px above the finger. Torch discs are
  36 px with a mouse and 44 px on touch screens, hit targets at least 44 px. No game limit on torches
  (more cost stars; a cap of 30 keeps the board fast). Alternatives: long press or a selected-torch
  button to remove (less discoverable); a fixed limit of k torches as in Unity (children get stuck).
- **2026-10-16 "Licht ins Verlies" scoring and flow.** The win triggers when the floor becomes fully
  lit after a placement or drop (not mid-drag), with a short pause to see the lit dungeon. Leaderboard
  per dungeon: torches first, then seconds since the first torch. Progress (current dungeon, best stars
  per dungeon, "So geht's" seen) is stored on the device and reset by the kiosk timeout. A dungeon
  picker shows the main set and the expert set.
- **2026-10-16 "Was steckt dahinter?" for dungeons with pillars**: Fisk's proof needs a dungeon without
  pillars, so those show how the computer checks the light: a ray sweeps once around the player's first
  torch and reveals its visibility polygon, then all torches light the dungeon. The theory view shows
  the bound ⌊(n + h)/3⌋ and the layers (triangulation, visibility polygons, Fisk's colouring where it
  works); Fisk's three colours also have three shapes. Alternative: no animation on those levels.
- **2026-10-16 Board turns by 90° on portrait screens** (shared `Board` option `autoRotate`): when a
  turned board is at least 15 % larger; icons stay upright. Alternative: a separate portrait layout per
  level. Reason: one rule for every board game, no level data to maintain.

### Track A ("Erobere das Land", "Rasenmähen")

### Track B ("Gassi gehen", "Straßenbau")

- **2026-10-16 Result dialog fits a laptop screen** (shared `ResultScreen`). Outcome and leaderboard
  share the left column, "Was steckt dahinter?" the right one; the card is up to 1120 px wide and the
  animation takes the height that is left (`clamp(110px, 100dvh − 530px, 40vh)`), so the dialog with
  the name picker and nine entries fits 1280 × 800 and 1366 × 768 without scrolling (a smoke test
  checks both). The leaderboard list switches to one column by container width. Alternatives: fewer
  nicknames or entries (less choice), the leaderboard on a second page (one more click at the booth).
  On phones the dialog still scrolls.
- **2026-10-16 Updates wait for the start map** (shared shell). A new service worker installs in the
  background and waits (`registerType: 'prompt'`, no `skipWaiting`); as soon as the app shows the start
  map or the attract screen (staff menu closed), it activates the new version and reloads, so a device
  that visited before shows a new deployment within seconds of the first load instead of on the second
  one, and never reloads during a game. Until then the old service worker keeps serving the old files,
  so a running game cannot lose a chunk. An open page (the booth) checks for a new version every hour.
  Alternatives: keep `skipWaiting` and reload on `controllerchange` (the new worker would already serve
  new files to the old page mid-game); a "new version" button (visitors would not press it).
- **2026-10-16 Game header wraps instead of overlapping** (shared `GameHeader`). It measures the natural
  width of its parts (back button, titles, status, buttons); when they do not fit in one line, the
  status moves to a centred line of its own and the buttons wrap. Before, the status could shrink to
  nothing and its content was drawn over the title between about 721 and 1180 px. A smoke test checks
  at 768, 1024 and 1280 px that nothing overlaps and the title is not cut off (`expectHeaderLaidOut` in
  `e2e/helpers.ts`, for every game's test to reuse). Alternatives: a fixed breakpoint (breaks again
  with a longer status), shrinking fonts and buttons (hit targets below 44 px).
- **2026-10-16 "Licht ins Verlies" counts torches without a limit in the text.** The header shows
  "Fackeln: 4" (dots: the level's number dashed, extra torches orange) and the subtitle "Ziel: 3
  Fackeln" instead of "Fackeln: 4 von 3" and "3 Fackeln erlaubt", which read oddly because more torches
  may be placed (they cost stars).
- **2026-10-16 Leaderboard names: remembered, all reachable, optional lucky number** (Kevin). The
  nickname chosen last is offered first (accent button "Wieder als …") the next time a score makes a
  board; in kiosk mode it is forgotten when the attract screen takes over (kiosk timeout), otherwise the
  device keeps it. "Andere Namen" pages through all 32 nicknames in a shuffled order (six per page, with
  a page counter), so every name can be reached. An optional lucky number 1–99 (digits typed, or − and
  +) follows the name ("Kluge Eule 7"); entries store it next to the nickname id. Still no free-text
  names. Alternatives: random subsets only (some names never offered), one list of all 32 names (too
  tall for the result dialog), letters or initials (free text by the back door).
- **2026-10-16 "Mensch" and "person", not "Herrchen" and "owner"** (Kevin). The one walking the dog is
  called "Mensch" in German texts and "person" in English texts (buttons, hints, explanations, docs;
  code uses `person` too, e.g. the colour `--person`). The mockup `docs/look/gassi-gehen.webp` still
  shows the old word.
- **2026-10-16 (proposed) "Gassi gehen" walks are TypeScript data, not IPE files**
  (`src/core/games/frechet/levels.ts`). Six walks in a 36 × 22 m castle park, two polylines each in
  metres (at most 20 segments), with a pond or bushes where needed; trees, rocks and a well are
  scattered by a seeded generator away from the paths. The leash is not stored but computed: Fréchet
  distance × the walk's factor (1.6, 1.4, 1.3, 1.25, 1.15, 1.08), at least 0.2 m above it, rounded up
  to 0.1 m (3.6 to 6.2 m). Alternatives: IPE files with a new collection in the importer (a shared
  file that track A changes at the same time for its maps). Reason: no shared importer change in
  parallel with track A; the paths are few and short. Can move to IPE once both tracks are merged.
- **2026-10-16 "Gassi gehen" walking rules.** Person and dog walk at 2.2 m/s (about 15–35 s per walk
  if nobody waits); a frame is checked in four steps and the moment the leash would get longer is found
  by bisection, so the leash never shows more than its length. The leash sags while slack and turns
  orange-red from 85 % of its length, when a bubble says "Leine fast straff!"; on the first two walks
  it also names the key to hold (the walker behind, whose step shortens the leash). As soon as no way to
  the castle is left with this leash, a banner says "Sackgasse" with a restart button (the computer
  knows: reachability from the current position). A snapped leash opens "Leine zu straff!" with who
  should have waited and "Nochmal". Alternatives: the leash stops the walker instead of failing (no
  tension, against the roadmap); no dead-end hint (visitors would stand stuck).
- **2026-10-16 (proposed) "Gassi gehen" scoring**: stars by the longest leash the walk needed compared
  with the Fréchet distance (within 10 % three, within 25 % two, else one), so a careful walk is
  better than a lucky one; the leaderboard per walk ranks the longest leash (lower is better). Time
  does not count. Alternatives: time (not the lesson), stars by finishing only (every level 3 stars).
- **2026-10-16 "Gassi gehen" controls.** The footer shows "A Mensch geht" and "L Hund läuft" as hold
  buttons that also work with the mouse; on touch screens they are two large buttons side by side
  (left person, right dog), each with its own touch point, so both can be held. Gamepad: left side
  (stick or d-pad left, X) for the person, right side (right, B) for the dog. Keys are read per frame
  from the shared key state.
- **2026-10-16 "Gassi gehen" theory view.** A square free-space diagram (axes are the two paths' arc
  lengths, each scaled to the square, so holding both keys is a fixed slope but not 45°), painted on a
  canvas from a distance field (200 × 200, computed once per walk; thresholding is fast enough for the
  slider), hatched where the leash does not reach, thin lines at the corners of the paths; the
  player's walk green, the computer's walk dashed (traced back through the reachable boundaries,
  preferring steps where both walk), the narrowest spot of the computer's walk marked. Ticks on the
  ε slider are the critical values where a passage opens at a corner (vertex–segment distances and the
  start and end distances); ‹ and › step through them; the text names the number of all candidates
  (with the bisector values) and the halving steps. Pointing at the diagram shows ghosts of person and
  dog in the park. Sandbox: draw the person's path, then the dog's (simplified to at most 20 segments
  with a 0.35 m tolerance), see their diagram, and walk them ("Ausprobieren", leash 1.2 × Fréchet
  distance).
- **2026-10-16 "Schätz die Leine"**: the player sets a length and presses "Probieren"; the computer
  walks a walk with that leash, or walks its best walk until the leash gets too taut (red). Tries are
  marked on the slider (green worked, red did not). "Auflösen" shows the Fréchet distance; stars by the
  shortest guess that worked (within 5 % three, within 15 % two). The explanation is the computer's
  own method: decide a length in the diagram, halve the range, only critical values. No leaderboard
  (the answer is the same for everyone).
- **2026-10-16 "Gassi gehen" smoke test plays closed-loop.** The park exposes the walkers' positions
  (`data-walk` on the board area); the test reads them every 80 ms and holds what the game's hint
  advises. A precomputed key schedule failed: each slot ran a little long in the browser and the
  walkers drifted from the plan.

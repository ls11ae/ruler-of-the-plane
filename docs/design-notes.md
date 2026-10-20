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

- Booth laptops: answered 2026-10-17: Windows laptops, Chrome or Firefox, standard mice (see the
  decision log, Phase 6). Open: the key test on each keyboard, the measurements of Phase 6.
- Solutions for the small booth lawns (targets and animations): answered 2026-10-17 by the offline
  solver `scripts/lawns/solve.py`; a solver of the chair can still replace any file in
  `levels/lawn-mowing/solutions/` with a shorter tour.
- Whether a floor plan of a TU Dortmund building can be used as a level: answered 2026-10-17, no.
- Who is responsible for the Impressum and privacy notice of the public site: answered 2026-10-17, the
  Algorithm Engineering Group (LS 11), Computer Science, TU Dortmund (`https://ae.cs.tu-dortmund.de/`).
  Its pages (Kevin, 2026-10-17): `https://ae.cs.tu-dortmund.de/imprint/`, `/privacy/` and
  `/accessibility-statement/`, linked from the start map since Phase 7.

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
- **2026-10-16 "Straßenbau" optional for November** (proposed; moot, since Phase 5 was finished the same day);
  the two research games have priority. Two parallel tracks after Phase 1.
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

### Phase 7 (booth preparation)

Entries of the session that prepared Phase 7 without the booth laptops (2026-10-17). The subsection
sits before Phase 6, so that the sessions extending Phase 6 and the tracks at their ends do not
conflict with it.

- **2026-10-17 The offline package serves the normal build at the paths of GitHub Pages.** One folder
  (`booth/README.md`): the app at `http://localhost:8137/ruler-of-the-plane/` (the Pages build with
  `VITE_TSP_BOARDS_URL=/tsp-boards/` and the PIN), tsp-boards at `/tsp-boards/` on the same origin (its
  kiosk frame needs that), Windows scripts beside them. The port is fixed, because the browser keeps the
  leaderboards, the staff settings and the app's offline copy per origin; `-Port` exists for a clash.
  Alternatives: the app at `/` (a second build with another `base`); `file://` (no service worker, no
  module workers); a random free port (empty leaderboards after every start).
- **2026-10-17 The local server is a PowerShell script on `System.Net.HttpListener`.** Windows PowerShell
  5.1 is on every Windows laptop and `http://localhost:<port>/` needs no admin rights, so nothing is
  installed or unblocked by an administrator. It serves GET and HEAD with the MIME types the browsers
  insist on (module workers, WebAssembly, manifest, fonts), never lists a folder, refuses `..`, hidden
  files, streams and backslashes, accepts only the host name `localhost`, and answers
  `If-Modified-Since`. A browser's requests are handled one after another, which is fast enough for one
  visitor (the app's service worker serves it from its copy after the first load). Alternatives: a
  portable Node or Python (about 30 MB more, and a binary SmartScreen may block); an own `.exe`
  (unsigned); `TcpListener` (works without http.sys, but a browser's idle pre-connections would stall a
  single-threaded loop). If a laptop refuses `localhost` all the same, the server prints the one
  `netsh http add urlacl` an administrator would run.
- **2026-10-17 tsp-boards is downloaded from its site by a crawler that fails loudly** (the task said the
  repository is private; the session's repository list now shows it as public). tsp-boards has no
  service worker, hence no precache list: `scripts/booth/fetch-tsp-boards.ts` follows `index.html`,
  module imports, `new URL(…, import.meta.url)` (workers, HiGHS' WebAssembly), data files named in the
  code and the `file` entries of its JSON indexes (countries, puzzles). Missing referenced files, a site
  without worker or WebAssembly, an empty file or a script from another host fail the workflow; the
  version it finds (`0.9.0+…`) goes into `VERSION.txt`. Checked against a local tsp-boards build (48
  files, byte for byte; the live site in CI: 51 files). The package is then played in Chromium and
  Firefox with every request to another host blocked, which would catch anything the crawler missed.
  Alternatives: building tsp-boards from its repository (possible now that it is public, but the site is
  what visitors get); its CI artifact (kept 30 days, needs a token for another repository).
- **2026-10-17 Start-Stand.cmd: Chrome in kiosk mode with its own profile, a watchdog, and power
  settings that are restored.** The start window checks the package against a size list (a half-unpacked
  ZIP, a virus scanner), removes the downloaded-file mark, starts the server hidden, and opens Chrome
  with `--kiosk` on `?kiosk` with its own `--user-data-dir` in `%LOCALAPPDATA%\RulerOfThePlane`, no
  first-run or default-browser pages, translation, pinch zoom, swipe navigation, crash bubble (also by
  marking the profile as closed cleanly), permission prompts or background traffic. Firefox follows with
  `--kiosk`, its own profile and a `user.js` with the same intent (also Ctrl+wheel scrolls instead of
  zooming), then Edge. The window stays open as a watchdog: a browser closed by a visitor (Alt+F4) opens
  again (at most 5 times in 2 minutes), a dead server restarts. It keeps display and system awake while
  it runs (`SetThreadExecutionState`, gone with the process), sets the active power plan's timeouts for
  display, sleep and hibernation to "never" with `powercfg` (allowed without admin on most laptops) and
  switches the screen saver off for the session only; Stop-Stand.cmd restores the saved values. It warns
  about a pending update restart and an inactivity-lock policy. Not done by script, because it needs
  admin rights or the Settings app: pausing Windows Update, touchpad gestures, notifications; they are in
  the checklist. Alternatives: Windows assigned access (admin rights and a separate account); a browser
  extension or policy (admin rights).
- **2026-10-17 The booth workflow tests on Windows itself.** `booth.yml` runs for `phase-*` tags, by hand,
  and for pushes that change the package's files: on `windows-latest` it builds a copy and tests the
  server under Windows PowerShell 5.1 and Start-Stand/Stop-Stand with Chrome and with Firefox (the server
  log must show the app's service worker and its precached levels; a browser ended by force must come
  back; Stop must restore the power plan); then on Ubuntu it builds the package, tests the server under
  pwsh, plays it, and uploads it (artifact `Stand-<version>`; for a tag also `Stand-<tag>.zip` on the
  tag's release, where the booth gets it). The jobs do not pass artifacts to each other, so the workflow
  needs no `download-artifact` (whose current major version a cloud session cannot look up). The first
  Windows run found that .NET Framework expands 8.3 names (`RUNNER~1`) in `GetFullPath`; the server now
  normalises its root the same way.
- **2026-10-17 (agreed by Kevin 2026-10-18) Impressum, privacy notice and accessibility statement behind one link.** The
  logo line of the start map ends with "Impressum · Datenschutz" (both layouts); it opens a dialog with
  the three pages of the Algorithm Engineering Group (`ae.cs.tu-dortmund.de/imprint`, `/privacy`,
  `/accessibility-statement`) and one sentence that the games send nothing. Outside kiosk mode they are
  links to a new tab; in kiosk mode each shows its address and a QR code for the visitor's phone, and the
  dialog closes when the attract screen returns. The Impressum is two clicks away, which German law
  accepts ("leicht erkennbar, unmittelbar erreichbar"). The QR codes are generated into
  `src/ui/shell/legalQr.ts` (`npm run qr`, qrcode-generator as a dev dependency; a test decodes them with
  jsQR), so the bundle has no new library. Alternatives: three links in the logo line (do not fit beside
  the logo on a phone); only on the credits screen (hard to find); a QR library at run time (a new
  runtime dependency for three fixed addresses).
- **2026-10-17 (rejected by Kevin 2026-10-18) QR poster A2 and card A6.** Not needed: the print material
  of the tsp-boards project already covers Ruler of the Plane. Removed on 2026-10-18: the poster, the
  card, the A4 sheet of cards, their part of `scripts/booth/print.ts` (which now prints only the cheat
  sheet and the checklist), their test and opentype.js. The QR codes of the legal pages in the app stay.
  As it was: `npm run booth:print`: parchment background with a
  double ink frame, the title in Eagle Lake, the five places with their taglines from the start map and
  the mathematics behind each (Kunstgalerie-Problem, Voronoi-Diagramm, Fréchet-Abstand,
  Rasenmäh-Problem, Spannbäume) and their map icons, "Spiel mit – hier am Stand oder zu Hause auf dem
  Handy:", a QR code for `https://ls11ae.github.io/ruler-of-the-plane/` (14 cm on the poster, 4 cm on the
  card; error correction M) with the address as text, and "Lehrstuhl 11 · Algorithm Engineering · TU
  Dortmund". SVG with every text as outlines (opentype.js; opentype.js 2.0's `toPathData` writes NaN at
  some sizes, so the path data is written from its commands), PDF printed by Chromium, also four cards on
  an A4 sheet with cutting lines. A test reads the QR code back; the session also read it from the
  rendered PDFs. Alternatives: text with embedded fonts in the SVG (print shops' tools often ignore
  them); a QR web service (privacy, no network in the sessions).
- **2026-10-17 Booth papers in German.** The cheat sheet (`docs/booth/spickzettel.md`, one A4 page, the
  print script fails if it grows), the checklist for the first laptop test
  (`docs/booth/checkliste-laptoptest.md`) and the package's `LIESMICH.txt` are read by the booth staff, so
  they are German like the app; the PIN is not printed ("PIN von Kevin"). The repository's own docs stay
  English (`booth/README.md`).
- **2026-10-17 `docs/texts-de.md` for proofreading, kept fresh by a test.** `npm run texts` lists every
  German text by dictionary and group with its key; texts that are functions are called with example
  values chosen by parameter name (a few per text where the general ones would read wrongly), once per
  case they distinguish: every boolean both ways, `null` where the type allows it, and every number the
  text compares a parameter with (singular and plural). Lists, not tables (Prettier would pad table
  columns to the longest text). A test fails when the file is stale, so a session that changes a text
  runs `npm run texts`. The Texts workflow uploads the file with every laptop screenshot of the smoke
  tests and of `e2e/screens.spec.ts` (pickers, a snapped leash, the end of the credits) as the artifact
  `texte-screenshots`. Alternatives: a CI artifact only (Kevin could not comment on lines in a pull
  request); screenshots in the CI job of every pull request (the browser track changes that job).

### Phase 6 (playtest and polish)

Entries of the Phase 6 session; it sits before the track subsections, which other sessions extend at
their ends.

- **2026-10-17 "Rundreise" opens tsp-boards in a new tab, in kiosk mode in a frame** (Kevin). tsp-boards
  is online (its gallery at `https://ls11ae.github.io/tsp-boards/`, the repository variable
  `VITE_TSP_BOARDS_URL`). Outside kiosk mode the place links there with `target="_blank"` and
  `rel="noopener"`, without a confirmation, so the map stays open. In kiosk mode a new tab would trap
  visitors (the kiosk browser shows no tabs, and the 90 s return to the attract screen would not reach
  it), so the place opens `#/tsp`: tsp-boards in its event mode (`#kiosk`: three levels, large buttons,
  no links out) in a full-size frame below a header with "‹ Karte". Input inside the frame counts for the
  kiosk timeout (`watchFrame` in `shell/idle.ts`), which needs the same origin: on GitHub Pages both apps
  are on `ls11ae.github.io`; a cross-origin frame cannot be watched, and then only focus moving into it
  counts. The frame may go full screen (`allow="fullscreen"`): tsp-boards' "Vollbild" fills the screen
  with the frame, Esc or the timeout returns. The frame opens in the language of the map (tsp-boards'
  stored language, same origin). Checked in the session with the real tsp-boards build served at
  `/tsp-boards/` next to the app (`TSP_BOARDS_DIST=<tsp-boards>/dist npx playwright test tsp-frame`, the
  app built with `VITE_TSP_BOARDS_URL=/tsp-boards/`): its data and workers load, "Vollbild" works, input
  in the frame keeps the timeout away, and 90 s without input return to the attract screen. For the
  offline booth package (Phase 7), serve tsp-boards' build at `/tsp-boards/` on the same local server and
  build the app with `VITE_TSP_BOARDS_URL=/tsp-boards/` (tsp-boards has no service worker). Alternatives:
  a new tab in kiosk mode too (a trap); a confirmation before leaving (Kevin: not needed).
- **2026-10-17 "Alte Ruinen" shows its address in kiosk mode instead of linking there.** Following the
  link would leave the app in the kiosk browser's only tab, with no way back and no timeout. Visitors
  read "online: kbuchin.github.io/ruler" and can open it at home. Alternatives: a frame as for
  "Rundreise" (another origin, so the timeout could not see the input; offline at the booth it would not
  load at all); hiding the place.
- **2026-10-17 Tests independent of the build variables.** The Pages build sets `VITE_TSP_BOARDS_URL`,
  and `StartMap.test.tsx` failed because it assumed the variable unset. `tspBoardsUrl()` now reads the
  variable when called, the unit tests stub both cases with `vi.stubEnv` (as the staff menu tests already
  did for `VITE_STAFF_PIN`), the smoke test checks whichever case the build has, and `e2e/tsp-frame.spec.ts`
  runs only for a build with the variable (with a stub page for tsp-boards unless `TSP_BOARDS_DIST` names
  a real build).

- **2026-10-17 "Licht ins Verlies" names ⌊n/4⌋ for dungeons with only right angles and no pillars**
  (Kevin): the theory view shows "Nur rechte Winkel: n Ecken ÷ 4, abgerundet: … (Kahn, Klawe, Kleitman,
  1983)", next to the ⌊n/3⌋ for any angles, with one paragraph on their proof (convex quadrilaterals, four
  colours); the explanation after the win adds the quarter to its first sentence and keeps Fisk's proof
  as the animation. A dungeon counts as orthogonal when every corner is a right angle in any orientation
  (`isOrthogonal` in `core/games/art-gallery/dungeon.ts`, cosine below 10⁻⁶). Of the shipped dungeons
  only agLevel3_2, the first, qualifies (18 corners: 4 instead of 6). Alternatives: a separate animation
  of the quadrilateral proof (one dungeon, much work); the bound only in the theory view.

- **2026-10-17 Credits screen** (`#/credits`, "Mitwirkende" on the start map: next to the logo line on
  laptops, a third button beside the language and full-screen buttons on phones). Short bilingual cards:
  this edition, the Unity original and its team, where the levels come from, the Kenney packs with a few
  of their pictures, the fonts, the libraries with their licences, and tsp-boards when "Rundreise" is on.
  "Alle Dateien und Lizenztexte" shows `credits.txt`, which the build writes from CREDITS.md and the
  licence texts of every bundled package (the runtime dependencies, Workbox and what they depend on)
  and both fonts (MIT, ISC, BSL and the OFL ask for their notices with every copy); it is precached, so
  it works offline. Addresses are text in kiosk mode and new-tab links otherwise. A test checks that
  CREDITS.md lists every asset file the app imports in the section of the importing game (or "Shared"),
  names every runtime library, and that `credits.txt` holds every licence. Alternatives: rendering
  CREDITS.md itself (English only, wide tables on phones); a per-file list in the app (nobody reads 60
  rows at a booth; it is in `credits.txt`); a link to the repository (a trap in kiosk mode, no use
  offline).

- **2026-10-17 Accessibility pass.** `e2e/a11y.spec.ts` checks every screen (start map in both languages,
  credits, attract screen, staff menu, how-to, result with the leaderboard, and each game's how-to,
  setup, board and theory, on the laptop and the phone) with axe-core (WCAG 2.1 A and AA; serious and
  critical violations fail) and three own checks in `e2e/contrast.ts`: the contrast of every visible text
  against the pixels behind it (the median of the background under the text, from a screenshot with all
  text hidden; axe cannot judge text over parchment, washes and SVG boards), texts under 14 px, and
  controls that do not take the pointer anywhere in the 44 × 44 px around their centre. Fixes: small
  buttons keep their 36 px look but take the pointer over 44 px (an invisible extension; their rows keep
  8 px gaps, the staff menu's rows got them), sliders and the lucky-number field are 44 px high; on phones
  the start map's taglines and logo line are at least 14 px (labels and islands moved a little,
  "Vollbild" no longer wraps); the language button and the hold buttons of "Gassi gehen" have accessible
  names that contain their visible text (the hold hint became a tooltip); the mower number is larger,
  ink on paper in the how-to as on the board (white on red was 4.2:1), and left out with one mower
  (phones). Colour is never the only cue any more: the second player of "Erobere das Land" has hatched
  land, a forked banner and a hatched dot (the first a pennant); a marked road in "Straßenbau" carries a
  cross (can go; also the road under the mouse) or a plus (to build), and the hints say "die Straße mit
  dem Kreuz/Plus" instead of "die rote/grüne Straße"; "Gassi gehen" mentions that the computer's walk is
  dashed and says "where the two stop" instead of "at the red spot". Already fine: ink on paper and
  parchment (every measured text at least 4.5:1, large text 3:1), Fisk's colours with three shapes,
  numbered mowers, mowed stripes against grass, hatched free space, texts next to every colour bar.
  Alternatives: small buttons 44 px high (taller theory panels and result dialog, which must fit
  1280 × 800); axe alone (it reports nearly all text over the parchment as undecidable).

- **2026-10-17 The 2-hour unattended run is simulated with a fast clock** (`e2e/soak.spec.ts`). Playwright's
  fake clock drives timers, animation frames and `performance.now()` in one-second steps, with a short
  real pause per step for the worker's answer (it computes in real time, so the demo plays its real
  moves). Every 7 simulated minutes a visitor wakes the booth, opens the next place on the map, clicks
  and presses a key there, and leaves; the kiosk timeout must bring the attract screen back within 95 s.
  The test fails on a page or console error, a crash, a demo without a new castle for 60 s, and memory,
  DOM nodes or event listeners that grow by half from the warmed-up state. The 120-minute run took 15
  minutes in the session and passed (numbers in the roadmap); CI runs 15 minutes. Alternatives: a real
  2-hour run in CI (too slow; it belongs on a booth laptop in Phase 7); no visitors (the kiosk cycle,
  where leaks would come from, would go untested).

- **2026-10-17 (agreed by Kevin 2026-10-18) "Rasenmähen": a step back per mower** (Kevin's playtest). Q (beside WASD)
  takes back mower 1's last step, Backspace (on the side of the arrow keys) mower 2's, B on a gamepad; with
  one mower both keys work, and on phones the dashed middle button of the direction pad does it. Each
  press takes back one step (holding does not repeat): the mower moves back, the cells only that step
  mowed grow back (each cell counts the footprints that cover it, also those of the other mower), and its
  steps go down. The cards show the keys as keycaps with a curved arrow (Q beside W, "Rück" beside ↑),
  "So geht's" lists them. Undo works while driving; during the drive home and after the round it does
  nothing. After a "Feierabend" that left grass, play continues from the starts and the way home counts
  as steps like any others, so undo takes it back step by step. Alternatives: Ctrl+Z (two keys at once,
  and both players would reach for it); taking back the whole "Feierabend" at once (an exception to one
  press, one step); undo on the result screen ("Nochmal" starts again).

- **2026-10-17 (agreed by Kevin 2026-10-18) "Straßenbau" gets two harder sets** (Kevin's playtest: too easy). The picker
  shows three sections: the eight maps so far as "Von Ort zu Ort", then six maps "Kreuzungen" (Euclidean
  Steiner tree), then six maps "Zwei Sorten" (minimum plane bichromatic spanning tree), then the random
  villages (still without junctions); "Nächstes Level" walks through them in this order. Each set shows
  its own "So geht's" the first time (the rules change), the header says "Kreuzungen 2 von 6"; stars,
  hints and the leaderboard per map work as before (boards `roads/steiner/<map>`, `roads/bichromatic/<map>`).
  Stored progress moves to version 2: the single how-to flag becomes one per set, and whoever had reached
  the random villages continues with the first map of "Kreuzungen" (the same index now). Alternatives: the
  new sets as separate places on the start map (the map has one place per game); behind the random
  villages (nobody reaches them at the booth).
- **2026-10-17 "Kreuzungen": optima computed offline, exactly.** `scripts/roads/steiner.ts` enumerates
  every full Steiner topology ((2n − 5)!!: 945 for 7 places) and solves each by Smith's iteration (a
  weighted linear solve per round); topologies within 0.1 % of the best are refined to convergence,
  junctions closer than 0.01 to a place or to each other are merged (degenerate topologies), and the
  merged tree is placed again. Tests: the equilateral triangle (one junction at the centre, 13.4 % shorter
  than the MST), the square (1 + √3 with two junctions), an obtuse triangle (no junction), and random sets
  (never longer than the MST, never below √3/2 of it, every junction three roads at 120°). Maps
  (`scripts/roads/steiner-maps.ts`): patches of a triangular lattice with a little seeded jitter, 3 to 7
  places, 1 to 4 junctions, the network without junctions 6–14 % longer. Random villages save only 1–3 %,
  too close to the 1 % rule to be worth the effort; the hexagon's jitter seed keeps its junctions 0.49
  away from the middle village (most seeds put one under its icon). The importer checks every stored
  optimum: a tree, its length, degree 3 and 120° (± 1°) at every junction, the MST length.
- **2026-10-17 (agreed by Kevin 2026-10-18) "Kreuzungen": junctions by hand, within 1 %** (the 1 % is Kevin's). A road dragged
  onto open land ends at a new junction there (on phones: tap a place, then open land); a junction is
  dragged to move it and dropped onto a place or junction to merge into it; a road dragged at its middle
  bends at a new junction; a junction without roads disappears. Every junction shows the angles between
  its roads below 180° (an arc and the degrees in a paper label; 120° to the degree is solid and bold,
  not only green). A network that connects all places and is at most 1 % longer than the stored optimum
  counts, but only when the pointer is let go (a junction in motion never wins). The tolerance is
  generous: on the triangle a junction 0.56 units off its spot is only 1.8 % too long, and within 1 % the
  angles can be 10–15° off. So on the win the junctions slide the last bit to their best spots (Weiszfeld
  steps on the player's own roads, half a second), and the angles read 120°: the rule shows itself where
  it is reached (since 2026-10-19 only within 0.03 % of the optimum, see "Kevin's playtest"). Hints compare with the stored optimum, its junctions matched to the player's (nearest
  pairs within 0.8): a junction without a match with one road (a dead end) or two (a bend), a missing
  junction as a dashed ghost with a road to it, a junction or road too many, a road missing, finally the
  junction furthest from 120° ("Schieb die Kreuzung im grünen Kreis…"); following them leads to the
  optimum from no roads, from the MST and from a wrong network on every map (tested). Theory: the 120°
  rule, the comparison with the network without junctions (both can be shown on the map), the
  Gilbert–Pollak conjecture (without junctions at most about 15 % longer, 15.5 % for the equilateral
  triangle; proven only for a few places), NP-hardness; the result screen animates the junctions moving
  from the middle of their places to their spots. Alternatives: a fixed number of junctions to place
  (gives away the topology); a tolerance on the angles (the length is what the king pays); snapping
  junctions to their best spot while dragging (no discovery left).
- **2026-10-17 "Zwei Sorten": optima computed offline with CP-SAT.** `scripts/roads/bichromatic.py`
  (OR-Tools 9.15, `pip install ortools`; only offline, not part of the app): a spanning tree on the
  castle–village roads by a single-commodity flow, a clause against every pair of crossing roads, and the
  total length (scaled to integers) minimised; CP-SAT must prove optimality. Maps with up to 8 places are
  also checked by brute force (in the script and in `plane.test.ts`). Maps: seeded random places (2–5
  castles, 4–7 villages, at least 0.95 apart, no three on a line), kept when the crossing rule matters
  (the tree without it has at least 2 crossings and is at least 2 % shorter than the optimum), the greedy
  strategy (always the shortest allowed road that crosses no chosen road) is at least 3 % longer than the
  optimum, and no road of the optimum or of the tree without the rule (the networks the game draws)
  passes within 0.4 of another place (it would seem to run through it); 0.3 on the largest map (12
  places), where an hour of search found none at 0.4 (the 10-place map already took 2.4 million seeds).
  The greedy strategy never got stuck on random maps of these sizes (none in 14,000 tries: a
  crossing-free forest rarely blocks every castle–village road between two of its groups), so "longer"
  is the criterion. Each map has its own seed range. No random maps in this set.
- **2026-10-17 (agreed by Kevin 2026-10-18) "Zwei Sorten": what the game refuses and what it marks.** A road between two
  villages or two castles is refused: its preview turns red while dragging, and letting go explains the
  rule in the footer. Roads that cross may be built: both turn red, the crossing is circled in red (a
  ring, so that the cross keeps marking the road a hint means), the state says "2 Schnittpunkte", and
  the network does not count until no roads cross. The texts
  say "schneiden" and "Schnittpunkt", so that "Kreuzung" keeps meaning a junction, as in the set before.
  Hints: a crossing road (the longer of the two), then a road the optimum does not use, then a missing
  one. Theory: the tree without the rule with its crossings next to the player's network (two sketches),
  the greedy length, NP-hardness (Borgelt et al. 2009) and the open question of the factor: at most
  O(log n) times longer (Akitaya, Biniaz, Demaine, Kleist, Stock, Tóth, ISAAC 2024), whether a constant
  suffices is open; the result screen animates Kruskal without the rule, then the optimum. Alternatives:
  refusing crossing roads (players could not try the easy tree and see why it fails, and would be pushed
  to the greedy strategy); only marking same-kind roads (a rule that is always broken by mistake is
  better enforced).
- **2026-10-17 The public site's Impressum and privacy notice are those of the Algorithm Engineering
  Group** (Kevin): LS 11, Computer Science, TU Dortmund, `https://ae.cs.tu-dortmund.de/`. The landing
  page links to its Impressum and privacy notice; the app itself sends nothing anywhere.
  Alternatives: an own Impressum (a person would have to be named); the TU's central pages.
- **2026-10-17 Booth laptops: Windows, Chrome or Firefox, standard mice** (Kevin). The Phase 7 start
  script is a Windows script.
- **2026-10-17 (agreed by Kevin 2026-10-18) Chrome at the booth; Firefox and WebKit in CI.** Every test so far runs in
  Chromium only, so the booth uses Chrome (its `--kiosk` mode and the offline install are the ones
  tested). Visitors' phones bring Safari (every browser on an iPhone is WebKit) and Firefox, so CI also
  runs the smoke tests in Firefox and WebKit (Playwright installs them in CI; cloud sessions have only
  Chromium). Alternatives: Firefox at the booth (untested, and the ink filter is an SVG displacement
  filter, whose speed differs between engines); Chromium only (iPhones are a large part of the QR
  visitors).
- **2026-10-17 No TU Dortmund floor plan as an art-gallery level** (Kevin).

### Browsers and performance (Phase 6, 2026-10-18)

Entries of the session that checked the browsers, the speed on weak laptops and the first visit on a
phone; numbers in `docs/performance.md`.

- **2026-10-18 Firefox and WebKit run the smoke tests in CI.** Four more Playwright projects,
  `laptop-firefox`, `phone-firefox`, `laptop-webkit` and `phone-webkit` (1280 × 800 and 390 × 844, scale
  factor 1 for laptops and 2 for phones, as in Chromium; Playwright's Retina preset made WebKit in CI draw
  four times the pixels and time out). Firefox has no `isMobile`, so the specs branch on a new option
  fixture `phone` (`e2e/fixtures.ts`); Firefox's phone has touch, a coarse pointer without hover (user
  prefs, so `(pointer: coarse)` shows the on-screen controls) and an Android user agent; WebKit's phone is
  an iPhone 13. The accessibility checks, the soak run and the benchmarks stay in Chromium (pixel contrast
  is measured there; the rest needs the Chrome DevTools Protocol). CI runs each browser in its own job next
  to the Chromium job, whose name stays; sessions cannot download the browsers and leave their projects
  out. Every smoke test passes in all three engines; the fixes it took were the safe area, the drawing
  speed and test time limits below. Alternatives: all browsers in one job (twice as long); Firefox's phone
  without touch (it would test the laptop layout at phone width).
- **2026-10-18 Phones keep the app inside the safe area.** The viewport no longer asks for
  `viewport-fit=cover`, which let the page run under the notch, the home indicator and Safari's toolbars
  although no style used `env(safe-area-inset-*)`: "‹ Karte" and the hold buttons could sit under the
  notch in landscape, the bottom controls under the home bar in the home-screen app. Safari now keeps the
  page in the safe area and fills the edges with its background. Alternatives: padding with
  `env(safe-area-inset-*)` on every screen (each screen's height is `100dvh`; many files, for edges that
  show only parchment).
- **2026-10-18 Frame times are measured under CPU throttling, opt-in** (`e2e/bench.spec.ts`, `BENCH=1`).
  Drags send one pointer move per animation frame, keyboard scenes hold keys as players do; the table
  reports frames per second and the main thread's work per frame from a light trace, since sessions and CI
  rasterise without a GPU (a worst case that throttling does not scale). Workers are not throttled by
  Chromium (measured), so the computer's move is timed unthrottled on a fixed game in the app's worker and
  multiplied by the rate. Not in CI: timings depend on the runner, and a benchmark that fails at random
  would be ignored. Alternatives: Lighthouse (page loads only, needs the network); a fixed time limit in a
  unit test (exists for the AI as a gross check, 1 s).
- **2026-10-18 Static art in layers of its own** (shared: `Board` takes `under`, `over` and `front`). The
  ink filter (an SVG displacement filter) is slow to rasterise, and a board was one picture, so a moving
  torch or walker made the browser draw the filtered walls or park again in every frame. Static art now
  goes to SVG layers of their own (same view, no pointer input, `will-change: transform`) that the browser
  rasterises once; `front` holds tokens that must stay above static art, while pointer input goes through
  to the board. Used by "Licht ins Verlies" (floor under, walls over, torches, hint and theory marks in
  front; `Torches` split from `TorchControls`). "Gassi gehen" had its scenery in such a layer too, until
  the camera of "Winding in the woods" (below), which moves a stage drawn once, made it unnecessary
  (merged 2026-10-18, the layer dropped). Dragging a torch among 17 on the largest dungeon: 47 instead of
  36 frames per second at 6× without a GPU; the picture is the same. Not used where measuring showed no
  need (lawn, roads, the Voronoi map). Alternatives: drawing the outlines wobbly in geometry instead of a
  filter (a change of the look); a cached bitmap of the walls (blurry when the window changes size).
- **2026-10-18 The game header measures only when a part changes size** (shared: `GameHeader`). Its
  layout effect depended on its ReactNode props, which are new in every render, so it forced a layout and
  rebuilt its ResizeObserver in every frame of a drag or walk (the largest script cost in a profile of the
  torch drag). Now one ResizeObserver and a MutationObserver for parts that appear or go.
- **2026-10-18 "Schwer" computes its move about 2.5 times faster.** (1) The look-ahead stops checking the
  opponent's answers to a tried move as soon as one beats it, strongest answers first: exact, the same 135
  moves on fixed games, 35 % less time. (2) It estimates the opponent's answers on a raster with twice the
  spacing (a quarter of the samples) and rates its own candidates on that raster first, only the best 24
  on the fine one: "Schwer" won 41 of 60 seeded games against "Mittel" (42 before; +6.2 points on average,
  +6.8 before) and 58 of 60 against "Leicht" (55 before). (3) The worker prepares the map and warms up while
  the player places the first castle. First move on the river valley with 10 castles each in the browser's
  worker: 29–34 ms (101 ms before, cold), about 135 ms at the 4× stand-in, under the Phase 2 target of
  200 ms. Alternatives: a lower `LOOKAHEAD` or a coarser `RASTER_STEP` for everything (weaker play, less
  exact scores for "Mittel" and the heat map); an exact update of each answer from the samples the tried
  move takes (tried: no faster, early castles take half the map).
- **2026-10-18 The parchment is a WebP** (35 instead of 723 kB, quality 85, made once with Pillow from
  Kenney's CC0 PNG; listed in CREDITS.md with the change). It was more than all other bytes of the start
  map together. On Slow 3G the start map is complete after 15.4 instead of 27.5 s, and the precache
  shrinks from 2.0 to 1.36 MB. Alternatives: JPEG (89 kB at the same quality); a smaller texture (blurry
  on large screens).
- **2026-10-18 No preloads, no lazy shell screens** (measured). Preloading the fonts and the parchment made
  the start map complete 1 s sooner but its first picture 4 s later (the fonts took bandwidth from the
  script); loading credits, staff menu, key test and demo page on demand would save about 5 kB gzipped,
  0.1 s on Slow 3G. The games already load when opened.
- **2026-10-18 The fonts as WOFF2** (approved by mbuchin, 2026-10-18). After the WebP parchment the
  fonts were two thirds of the start map's bytes (293 kB as TTF). The app now loads WOFF2 versions with
  the same font data, compressed: 99 kB, the start map complete after 11.3 instead of 15.4 s on Slow 3G
  (256 instead of 456 kB). Converted with fontTools (`woff2.compress`, the default lossless glyph
  transform); a TTX dump of each WOFF2 equals that of its TTF except the computed checksum, the `head`
  flag the WOFF2 format sets after its transform, and Patrick Hand's empty `DSIG` placeholder (no
  signature), which WOFF2 drops. The OFL FAQ treats such a conversion with unchanged font data as no
  Modified Version, so the names stay. The TTFs stay in `assets/fonts/` for the print files
  (`scripts/booth/print.ts`). Alternatives: keep TTF (GitHub Pages may compress them in transit; not
  measurable from a session); `font-display: swap` (text at once in a fallback font, then a jump).
- **2026-10-18 Test time limits for slow browsers.** A walk counts at most 50 ms per frame, so in a
  browser that draws under 20 frames per second it runs in slow motion (fair to the player); WebKit in CI
  did, before the park's layer (now the camera's stage) and the scale factor above. "Behind the beech" now
  waits up to 40 s for the dog (90 s test time). The game itself is unchanged.

### Track A ("Erobere das Land", "Rasenmähen")

- **2026-10-16 Booth lawns for "Rasenmähen"**: five lawns of 304–462 cells (Vorgarten, Gemüsegarten,
  Schlossgarten, Obstwiese, Stadtpark) with ponds, trees and flower beds as holes, each a pyutils27
  instance with a 3 × 3 cutter for 1 and for 2 cutters, in `levels/lawn-mowing/instances/`; the chair's
  solver solutions go to `levels/lawn-mowing/solutions/`. Drawn as text grids in
  `levels/lawn-mowing/lawns.txt` and converted by `scripts/lawns/make_instances.py`, which validates them
  with the pyutils27 schema. A hole's art follows from its shape (tree, flower bed, pond), so the files
  stay plain competition instances. The instances have no start position, as in the competition; the
  game starts each cutter on a point of the solver's tour, so the target stays reachable. Alternatives: a
  fixed shed as the start (the solver would need an extra constraint, and the target might be out of
  reach); drawing the lawns in IPE (no snapping to cells, no check of pinch points). New level sources go
  to `levels/<game>/`, since `legacy/` is the read-only copy of the Unity files.

- **2026-10-16 Maps of "Erobere das Land" drawn in IPE with layers**: `frame` (one rectangle, the sheet),
  `land` and `water` (closed polygons; land may reach beyond the frame), markers `square` = city,
  `cross` = gold mine, `disk` = forest, `circle` = mountains (`levels/voronoi/README.md`). The importer
  computes the scoring land (frame ∩ land − water) and the inland water with Clipper2, so the game needs
  no polygon boolean operations at load time. Three maps: island with a lake and an islet, river valley
  (land fills the sheet, a river with a tributary), lake district (coast and six lakes). Alternatives:
  land and water by nesting depth (no rivers that reach the frame), fill colours as the marker of water
  (invisible in the file). The IPE reader now records each object's layer (shared script code).
- **2026-10-16 Score in points**: all land together is worth 100 points (one point = one percent of the
  land), a city 5 and a gold mine 10 for the owner of the cell that contains it. Totals are shown and
  compared rounded to whole points; equal totals are a draw. Alternatives: area in map units (meaningless
  numbers); Unity's share of the rectangle including water.
- **2026-10-16 (agreed by Kevin 2026-10-17) Spacing rules**: castles keep the distance d = 0.55·√(land /
  castles in the game) from each other (on the island 1.1 units with 10 castles each, 1.5 with 5), shown as a
  dashed ring of radius d/2 around every castle, so the rule reads "rings may not overlap"; the ghost's ring
  and the rings it collides with turn red. Castles also keep 0.15 units from the water (a castle drawn at the
  shore seemed to stand in the lake) and 0.55 units from cities and mines (castles covered the town icons).
  Alternatives: a fixed distance per map; no distance to towns. A player with no room left passes.
- **2026-10-16 Blue starts, the computer is orange and moves second.** Alternatives: random start; the
  computer first. Reason: the natural order for visitors; the last move is an advantage, which the
  computer's strength levels balance. Check in the playtest.
- **2026-10-16 The computer of "Erobere das Land"**: candidate positions are a jittered grid (about 320 on
  the land), positions just outside the distance ring of every castle and next to every city and mine;
  each is rated on a land raster (spacing 0.125, 5,000–10,000 samples, rows pruned by the largest
  distance to a castle) by its swing: own points gained plus the opponent's points lost. "Leicht" takes
  a random move with at least half the best swing, "Mittel" the best swing, "Schwer" the best of its top
  eight after the opponent's best answer (one ply ahead; as answers it rates the opponent's 30 best
  positions and every candidate within three times the distance of the tried move, the only places the
  move changes). Positions are tested for land and the coast margin in one floating-point pass over the
  coast. The staff's difficulty (easy, normal, hard) is the default strength; the setup offers all three.
  Measured in a cloud session after these speed-ups: the slowest "Schwer" move 50–55 ms (before them up
  to 300 ms; another session measured 211–231 ms for the slower version), "Leicht" and "Mittel" a few
  ms; "Schwer" beat "Leicht" in 104 of 120 games and "Mittel" in 77 of 120. Raster and exact scores
  differ by less than one point (1 % of the land) in the tests.
- **2026-10-16 The 200 ms move time is measured on a booth laptop, not in the unit tests.** Wall-clock
  time depends on the machine (CI runners and cloud sessions vary by a factor of two or more), so
  `ai.test.ts` logs the slowest "Schwer" move and fails only above 1 s, which catches gross slowdowns
  without being flaky. The acceptance target of Phase 2, under 200 ms per move, is checked on each booth
  laptop in the playtest (Phase 6): the theory view shows the computing time of the computer's last move
  (measured in the worker). If a laptop is slower, "Schwer" can rate fewer moves ahead
  (`LOOKAHEAD`) or use a coarser raster (`RASTER_STEP`). Alternatives: a fixed 200 ms assertion (failed
  at 211–231 ms in another session); no timing test at all.
- **2026-10-16 "Erobere das Land" interaction**: with a mouse the ghost castle follows the pointer and
  shows its future cell, its ring and a box with the gain ("+7 Land, +5 Stadt"), a click builds; with
  touch the ghost floats 64 px above the finger while pressed, releasing builds, and a quick tap (under
  180 ms without moving) only explains how to aim. A setup dialog before each game: map, opponent
  (computer or two players), strength, 5 or 10 castles each; the chosen map shows behind it.
- **2026-10-16 Theory view of "Erobere das Land"**: switches for the Voronoi diagram over the whole sheet,
  the Delaunay triangles and their empty circumcircles, and a heat map of the swing of the next castle
  (computed in the worker, in its own yellow-to-red colours with a ring at the best spot, so it reads on
  both territories). The heat map also works after the game: where one more castle would have helped
  most. "Was steckt dahinter?" shows circles growing from all castles at the same speed, each filling
  only its own cell, until the borders appear.
- **2026-10-16 Attract mode = computer against computer**: a game may provide `attract.tsx`, a demo the
  attract screen plays behind its text (shared change: discovered like the games, a failing demo just
  disappears). "Erobere das Land" plays Mittel against Schwer with 8 castles each, one castle every
  0.9 s, map after map.

- **2026-10-16 "Rasenmähen" keeps the competition's coordinates**: the lawn levels in
  `public/levels/lawn-mowing/` store region, cutter and tours as in pyutils27 (integers, y up); the game
  flips y only to draw, and draws a cutter at the centre of its footprint (the reference point of the
  3 × 3 cutter is the corner of its middle cell). Alternative: convert to y down at import. Reason: the
  solver's files and the verifier fixtures can be compared without conversion. Coverage and tour lengths
  agree with the pyutils27 verifier on committed fixtures (`levels/lawn-mowing/fixtures/`, made by
  `scripts/lawns/make_fixtures.py`).
- **2026-10-16 (agreed by Kevin 2026-10-17) Start points and target of "Rasenmähen"**: cutters start on the
  first point of the solver's tours, so the solver's longest tour ("Ziel vom Löser") is reachable from there.
  Until the chair's solutions arrive, the game uses a simple strip strategy (back and forth in strips as high
  as the cutter, best orientation and offset, split into groups for two cutters) for the start points, as the
  target ("Ziel (Streifen-Strategie)") and for the animations. Stars: with the solver's target T three up to
  1.1·T, two up to 1.3·T, a record below T; against the strips three for matching them, two up to 20 % above.
  Tune in the playtest. Alternatives: a fixed shed as the start (the solver would need the start as a
  constraint); "[Wert]" as a placeholder (no goal to play for).
- **2026-10-16 "Rasenmähen" controls**: cutter 1 WASD, cutter 2 the arrow keys (with one cutter both
  steer it), gamepads 1 and 2, space or A for "Feierabend". A press moves one lattice step at once (on
  the key event, so a short tap between two frames counts), then after 220 ms one step every 115 ms
  (about 9 per second); of several held keys of one cutter the newest counts. Keys and the direction pad
  mean screen directions, also on a phone board turned by 90°. Cutters may drive up to 2 cells beyond
  the lawn's bounding box and cross holes. Phones (coarse pointer) play with one cutter: a direction pad
  with hold buttons at the same rate and a "Feierabend" button; the two-cutter option is not offered there.
- **2026-10-16 "Feierabend"**: all cutters drive home at once on a shortest L1 way (of the two L shapes
  the one through more uncut lawn), 70 ms per step. If lawn is left, play continues from the starts ("Da
  ist noch Gras: n Felder!"); the round ends when everything is mowed and every cutter is home. The live
  display shows each cutter's steps and its way back ("+6 zurück"), the longest tour including the way
  back (the score) and the target. Alternative: "Feierabend" only once everything is mowed. Reason:
  players learn that the way back counts.
- **2026-10-16 Theory of "Rasenmähen"**: the min-max objective, the lower bound ⌈(N − 9k)/3k⌉ rounded
  up to an even number (a closed tour on the grid has even length) with the lawn's numbers, the solver's
  tours (or the strips) played back on a small picture, and the competition instance `smr_882k_481_3s3`
  (481 cells, three cutters) with the example solution of pyutils27.
- **2026-10-17 Offline solver for the booth lawns** (`scripts/lawns/solve.py`, Python with OR-Tools
  CP-SAT and pyutils27, versions pinned in `scripts/lawns/requirements.txt`): first the simple strategies
  of `heuristics.py`, then large neighbourhood search from the three best of them. CP-SAT re-routes a
  stretch of 10–60 steps of a tour between its ends (a circuit constraint, each point at most once or
  twice), two nearby stretches together (so grass can change hands, also between the two cutters), or
  all edges inside a small rectangle (tours as edge multisets with even degrees, connectivity by a flow;
  this can reconnect passes); a move is kept if the longest tour does not get longer, and the solution is
  kicked when the search stalls. 15 minutes per instance (four at a time on four cores), then 20–40
  more for those with the largest gaps; the files keep their lower bound and the best simple strategy in
  `meta`, and a new run only replaces a file by a better one.
  Alternatives: one CP-SAT model of the whole tour (visited points, edges used 0–2 times, even degrees,
  connectivity by a flow; after two minutes worse than the strips); connectivity in the windows by cuts
  added when a solution falls apart (tried, slower than the flow). The game's start points, targets and
  animations come from these files.
- **2026-10-17 Lower bound of the booth lawns: a circulation relaxation.** Walking once around a closed
  tour, every lawn cell is "entered" by some step (it is under the cutter after the step but not before)
  unless it lies under every position of the tour, which only a tour within a 3 × 3 block of positions
  can manage. A step enters at most the three cells of the new row of its footprint, fewer at the lawn's
  edge and at holes, so the shortest circulation (as many steps into each position as out of it,
  connectivity dropped) that enters every lawn cell bounds the total length of the tours. CP-SAT solves
  it in seconds on the smaller lawns; on Schlossgarten and Stadtpark SCIP (bundled with OR-Tools) proves
  better bounds than CP-SAT within five minutes. On the booth lawns it is 2–18 steps above the area bound
  ⌈N/3k⌉, and the best tours are 2–8 % above it. The theory view keeps the simpler area argument
  ⌈(N − 9k)/3k⌉.
- **2026-10-17 Simple strategies and "boring" lawns**: the yardstick for the solver is what a visitor
  might do: the game's strips; a spiral along the edge of the grass that is left (straight on while that
  mows something); always to the nearest grass (the step that mows most first); for two cutters also two
  halves of the lawn mowed alone with one of these, and both cutters at once. A lawn counts as
  interesting if the best of these is at least 15 % above the best tour and as boring if within 5 % (rule
  of the person running the session); boring lawns would be redesigned. None is boring: the best simple
  strategy is 6–22 % above the best tour (closest: Obstwiese with one cutter, where the spiral needs 174
  steps and the best tour 164, and Gemüsegarten with two, 68 against 64); four instances are
  interesting. Since better tours only raise these numbers, the verdict holds.

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
- **2026-10-16 (agreed by Kevin 2026-10-17) "Gassi gehen" walks are TypeScript data, not IPE files**
  (`src/core/games/frechet/levels.ts`). Six walks in a 36 × 22 m castle park, two polylines each in metres (at
  most 20 segments), with a pond or bushes where needed; trees, rocks and a well are scattered by a seeded
  generator away from the paths. The leash is not stored but computed: Fréchet distance × the walk's factor
  (1.6, 1.4, 1.3, 1.25, 1.15, 1.08), at least 0.2 m above it, rounded up to 0.1 m (3.6 to 6.2 m).
  Alternatives: IPE files with a new collection in the importer (a shared file that track A changes at the
  same time for its maps). Reason: no shared importer change in parallel with track A; the paths are few and
  short. Can move to IPE once both tracks are merged.
- **2026-10-16 "Gassi gehen" walking rules.** Person and dog walk at 2.2 m/s (about 15–35 s per walk
  if nobody waits); a frame is checked in four steps and the moment the leash would get longer is found
  by bisection, so the leash never shows more than its length. The leash sags while slack and turns
  orange-red from 85 % of its length, when a bubble says "Leine fast straff!"; on the first two walks
  it also names the key to hold (the walker behind, whose step shortens the leash). As soon as no way to
  the castle is left with this leash, a banner says "Sackgasse" with a restart button (the computer
  knows: reachability from the current position). A snapped leash opens "Leine zu straff!" with who
  should have waited and "Nochmal". Alternatives: the leash stops the walker instead of failing (no
  tension, against the roadmap); no dead-end hint (visitors would stand stuck).
- **2026-10-16 (agreed by Kevin 2026-10-17) "Gassi gehen" scoring**: stars by the longest leash the walk
  needed compared with the Fréchet distance (within 10 % three, within 25 % two, else one), so a careful walk
  is better than a lucky one; the leaderboard per walk ranks the longest leash (lower is better). Time does
  not count. Alternatives: time (not the lesson), stars by finishing only (every level 3 stars).
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
- **2026-10-16 "Straßenbau" maps**: the four Unity MST maps (five places each) are short warm-ups, so
  they are followed by the point sets of Unity's spanner and TSP levels (9, 12, 16 and 19 places, used
  for the MST), then random villages (8 places, one more per new map up to 14; seeded, the seed shown
  in the subtitle so a map can be reproduced). Castles (the levels' `square` markers) only look
  different. Alternatives: random maps only after the Unity ones (four maps of five places are over in
  a minute); the 26-place spanner map (too long for the booth).
- **2026-10-16 "Straßenbau" controls and checks.** Drag from a place to another, or tap two places one
  after the other (phones), to build; tap or click a road to remove it (mouse: a road under the pointer
  turns red). Places are 66 px icons with 28 px hit radius. The header shows the length (1 unit =
  1 km) and either how many parts are still separate, "+x % über dem Optimum" (one decimal below 10 %,
  so it never reads +0 %) or "Optimal!". The round is won as soon as the network connects everything
  and is as long as a minimum spanning tree (lengths compared, so ties never reject an optimal tree).
- **2026-10-16 (agreed by Kevin 2026-10-17) "Straßenbau" hints and scoring.** "Tipp" names, in this order, the
  longest road of a ring, a road that no shortest network uses (a path of shorter roads joins its places), or
  Kruskal's next road between two separate parts; the hint is shown in the footer, where it covers no place.
  Stars by hints (none three, one two, more one); the leaderboard per fixed map ranks the time to the optimum
  plus 20 s per hint. Random maps have no leaderboard. Alternatives: stars by "+x %" at a "Fertig" button (the
  game would end before the optimum, which is the point), no hints (players get stuck on the 19-place map).
- **2026-10-16 "Straßenbau" explanation and theory**: the result shows Kruskal on the player's map
  (roads by length, a ring-closing road flashes red and disappears); the theory panel explains why the
  shortest network is a tree (n − 1 of n(n − 1)/2 possible roads) and runs Kruskal step by step on the
  map itself (next step, all steps, from the start), and says that solutions are checked by comparing
  lengths.

### Bonus "Im Wald" ("Gassi gehen", homotopic Fréchet distance)

- **2026-10-17 (agreed by Kevin 2026-10-17) Four bonus walks in the woods.** Trunks are small regular
  octagons (radius 0.45–0.6 m) that the leash cannot pass; the leash is the shortest curve in its
  homotopy class (a taut rope around the trunks, Chambers et al., "Walking your dog in the woods in
  polynomial time") and starts straight at the gate. Walks: "Um die Eiche" (both once round an oak, the
  dog close to the trunk), "Slalom" (six trees, the dog in wider bends), "Hinterm Baum" (the dog fetches
  a stick behind a beech; the person must wait before the beech) and "Dickicht" (slalom, then the oak,
  short leash). Leash = target × 1.35, 1.25, 1.2, 1.12, at least 0.2 m more, rounded up (2.7, 2.4, 6.1,
  2.2 m). Walking together snaps the leash on every walk; on "Hinterm Baum" the trees raise the shortest
  leash from 3.8 m (without trees) to 5.0 m. No trunk lies in the area enclosed by the two paths (winding
  number 0, tested): there it would catch the leash for good. Alternatives: a combined expert walk with a
  fetch and a loop (tried: the fetch's long leash leaves the loop slack, so walking together sufficed
  after the fetch); trunks as points (a rope bending at a point looks wrong). The walks are TypeScript
  data (`src/core/games/frechet/woods/shapes.ts`), like the six walks.
- **2026-10-17 "Im Wald": rope update, leash classes and the offline search.** How the leash lies is
  a word of ray crossings (a ray from each trunk straight up; disjoint rays are tested). The game
  updates the rope incrementally: a moving end sweeps a triangle and the rope catches on the trunk
  corners inside it (their convex chain), and a corner the rope no longer turns around is released;
  a quick test skips the exact update when nothing changes. The target is computed offline
  (`npx tsx scripts/woods-targets.ts`, a few seconds) by a search over (person's sample, dog's sample,
  leash word) on both paths sampled every 5 cm, moves person / dog / both: a bottleneck Dijkstra gives
  the smallest longest leash, a second pass picks a walk within it with few changes of who walks (the
  computer's walk). Each state's leash is computed from scratch (Dijkstra in the visibility graph of
  the trunk corners, following segments whose words continue the class word), independently of the
  rope update. Stored in `targets.json`; tests: the stored values equal a fresh search, the rope
  carried along the search's walk has the search's length (to 1e-9) and word at every sample, the
  rope agrees with the from-scratch curve on random walks, the game's step reaches the castle on the
  stored walk and by following the hint. Hints and the dead-end banner use a 15 cm grid of positions
  (advice with one grid step to spare). Alternatives: the free-space cell propagation in the
  universal cover (exact, but much more code for four walks).
- **2026-10-17 (agreed by Kevin 2026-10-17) "Im Wald": theory view and "Was steckt dahinter?".** Finding:
  with the leash starting straight at the gate and moving continuously, how it lies at positions (s, t)
  does not depend on the walk: it is the class of "back along the person's path, the start leash, along
  the dog's path" (P[s→0] · ℓ₀ · Q[0→t]). The search confirms one class per pair of positions on all four
  walks (tested). So a diagram of positions still exists here, with the leash measured around the trees;
  with convex trunks even each cell's light part stays convex (the universal cover of the plane minus
  convex obstacles is CAT(0), where the distance between two straight walks is convex). What does not
  carry over: the light part is no longer an ellipse per cell, the special leash lengths run around
  trunks, and in the general homotopic Fréchet distance, where the start leash may be chosen around
  trees, there is one diagram per start class (a stack of sheets), which is the case the paper solves.
  Proposal: the theory panel shows the park's diagram with the woods leash, tinted green (dotted, not
  colour alone) where the leash touches a trunk (light: touches and reaches; hatched: touches and too
  short), a switch "Mit Bäumen / Ohne Bäume" that shows the park's diagram of the same paths, the
  computer's walk and its narrowest spot, and pointing shows the ghosts with their wrapped leash. "Was
  steckt dahinter?": "Im Wald legt sich die Leine wie ein straffes Seil um die Stämme: Wie sie liegt,
  hängt davon ab, wer zuerst an welchem Baum vorbei ist. Der Computer hat alle Stellungen im Abstand von
  5 cm durchprobiert; im Diagramm ist grün gepunktet, wo die Leine an einem Baum hängt. Die kürzeste
  Leine, mit der es klappt, heißt homotoper Fréchet-Abstand: hier …, du brauchtest …", with the diagram
  animation of the player's walk. Alternative if a diagram is not wanted: replay the computer's walk in
  the woods with the rope wrapping and unwrapping, and the leash length as a curve over time.
- **2026-10-17 "Im Wald": play and look.** Same controls, speed, stars (longest leash against the
  target) and leaderboard rule as in the park (boards `frechet/woods-<id>`). A trunk the leash touches
  gets a thick orange-red outline, and the "Leine fast straff!" bubble adds "Die Leine hängt am Baum.";
  a leash that snaps while caught says so. Who-should-walk hints on the first three woods walks.
  Trees the leash can catch on are drawn from above (Scribble `tree.png` crown, multiplied onto the
  parchment, with the octagonal trunk); the forest around is Cartography pines, kept more than half
  the leash away from both paths, so no drawn pine can ever touch the leash. The bonus set is a
  section "Im Wald" in the picker of walks, and "Nächstes Level" after "Für Profis" leads into it;
  its progress is stored apart (`rotp-frechet-woods`), reset by the kiosk timeout, and the woods
  have their own "So geht's" (shown once per device) with an animation of the leash winding round a
  trunk and coming free.

### Phase 6: tiers at the start of each game, attract demos (2026-10-17)

Kevin's playtest: he did not find the harder sets of "Straßenbau", which were only in the "Karten"
overlay, and the same held for the harder levels of the other games. This session (one of four in
parallel) changed how each game is entered and the attract screen; inside the games only the entry
screens and pickers changed (in "Gassi gehen" nothing else, since another session works on its walk
screens tonight).

- **2026-10-17 (agreed by Kevin 2026-10-18) Every game opens on a tier screen.** The first screen of a game shows its
  rules (the two or three sentences of "So geht's", its animation and keys) and three big cards
  "Leicht", "Mittel", "Schwer", each with the set's name where it has one, a one-line teaser, the stars
  collected on this device (with one to three bars, so not only the word tells the difficulty), and
  "Weiterspielen" when there is progress. A card starts its tier at the first level without stars
  (else the first). Since the screen shows the rules, the first level no longer opens with the "So
  geht's" dialog: from the start map one click to playing. Only a set with new rules ("Kreuzungen",
  "Zwei Sorten", the woods) still shows its own "So geht's" the first time. The screen appears every time
  a game is opened from the map; "‹ Karte" leads back. On phones the text comes first, then the cards,
  then the animation at full width (its labels stay at least 14 px). Shared code:
  `components/TierScreen.tsx`, `core/tiers.ts`. Alternatives: a dialog over the first level (one click
  more); tiers only in the picker (the problem Kevin had); skipping the screen when there is progress (at
  the booth every visitor starts after the kiosk reset anyway, at home the screen offers "Weiterspielen").
- **2026-10-17 (agreed by Kevin 2026-10-18) Which levels form the tiers.**
  - "Straßenbau": "Leicht" = "Von Ort zu Ort" (minimum spanning tree, the eight maps and the random
    villages), "Mittel" = "Kreuzungen" (Steiner tree), "Schwer" = "Zwei Sorten" (plane bichromatic
    spanning tree; teaser: even researchers do not know yet how close a computer can always get to the
    best network).
  - "Gassi gehen": its tiers as they are (each first in the park, then in the woods).
  - "Licht ins Verlies": the nine main dungeons by their order, the four for two or three torches as
    "Leicht", the five for four to eight torches (mostly with pillars) as "Mittel"; "Für Profis" as
    "Schwer". The header reads "Mittel 2 von 5 · Ziel: 4 Fackeln".
  - "Rasenmähen": the tiers are lawns; the number of mowers stays the visitors' choice ("Allein" or "Zu
    zweit" above the cards on a laptop, alone on phones), and stars count per lawn and number of mowers.
    "Leicht" = Vorgarten (304 cells), "Mittel" = Gemüsegarten and Obstwiese (345 and 426 cells),
    "Schwer" = Schlossgarten and Stadtpark, the two lawns where the best simple strategy is clearly worse
    than the best tour both alone and with two mowers (18.1 and 13.5 %, 17.4 and 21.7 % above it; see
    `levels/lawn-mowing/README.md`). The others come within about 6 % for one of the two counts
    (Gemüsegarten with two mowers, Obstwiese alone) or are the smallest lawn. Alternatives: the ten
    instances (lawn and number of mowers) as levels (a tier would decide whether one or two play, and
    phones mow alone); "Schwer" by the README's 15 % mark (Gemüsegarten, Schlossgarten and Stadtpark alone,
    only Stadtpark with two: the tiers would change with the choice of mowers).
  - "Erobere das Land": the computer's strength ("Mittel" is the AI level `normal`), on the three maps in
    order; a star for each map won against that strength. "Zu zweit spielen" beside "Weiterspielen"
    starts a game of two; "Neu" opens the full setup as before, its strengths named like the tiers and
    maps won at the chosen strength marked "gewonnen". The header names the strength.
- **2026-10-17 Last tier per device, kiosk reset, staff suggestion.** The tier last played per game is
  stored on the device (`rotp-tiers`) and marked "zuletzt gespielt" on the tier screen (the card also
  gets the focus); the kiosk timeout clears it with the games' progress. The staff menu's single
  difficulty (meant for computer opponents, used only by "Erobere das Land") became "Schwierigkeit beim
  Start": a suggested tier per game, marked "empfohlen" while the device has no last tier (so after every
  kiosk reset); a second click removes it. Stored settings of version 1 keep a changed difficulty as the
  suggestion for "Erobere das Land". Alternatives: the staff's tier skipping the tier screen (visitors
  should see that there is more); a global tier for all games (the games' tiers are not comparable).
- **2026-10-17 After a tier's last level, the next tier.** "Nächstes Level" on the result screen of a
  tier's last level reads "Weiter mit „Mittel“" and starts the next tier's first level ("Zwei Sorten"
  leads on to the random villages, as before). The label comes from the game's entry through a React
  context (`components/nextLabel.ts`), so the play screens need not know the tiers. "Erobere das Land"
  offers the next map after a won game, after the third map the next strength; "Rasenmähen" the next lawn
  in the order of the tiers.
- **2026-10-17 The pickers show the tiers as sections.** "Straßenbau": "Leicht · Von Ort zu Ort" (with
  the random villages), "Mittel · Kreuzungen", "Schwer · Zwei Sorten"; "Licht ins Verlies": "Leicht",
  "Mittel", "Schwer · Für Profis"; "Rasenmähen" ("Neu"): the lawns in three columns with their stars;
  "Erobere das Land" ("Neu"): the strengths; "Gassi gehen": its tier buttons as before.
- **2026-10-17 Attract demos for all five games, in turn.** The attract screen shows one game's demo at a
  time, full screen above a band with the game's name and tagline, "Komm spielen!", the prompt and the
  "Mensch gegen Maschine" tally, and moves on when the demo is done (about 20–30 s; cut off after 40 s, a
  failing demo is skipped). A demo gets `round` (to vary the level) and `onDone` (`AttractProps` in
  `games/registry.ts`). Only precomputed solutions, nothing heavy while it plays:
  - "Licht ins Verlies": torches placed one by one, the light spreading from each, the last dark spot
    pulsing before the last torch lights it; four dungeons (3, 4, 5 and 8 torches, each the level's
    number), the torches found offline by `scripts/art-gallery/demo-torches.ts` (a greedy cover on a
    raster with restarts and a two-for-one swap, then the exact check; a unit test checks them). The
    light of each prefix is computed once when the demo starts.
  - "Erobere das Land": the computer against itself as before, now one map per turn.
  - "Gassi gehen": the computer's walk (its optimal walk, computed once per walk as in the game) in the
    park, with the free-space diagram beside it drawing the walk up to the current position.
  - "Rasenmähen": the solver's tours mowing a lawn, all mowers at once.
  - "Straßenbau": on a map of "Kreuzungen", Kruskal builds the shortest network from place to place,
    road by road, the cheapest first (a road closing a ring flashes red); then junctions appear and
    slide to their Steiner points (the Weiszfeld rounds of the result animation), where the 120° arcs
    show.
    The soak test now reads which demo plays (`data-demo`, `data-slot`) and how far it is (`data-step` of
    each demo) and checks that all five had their turn. Alternatives: the old card in front of a demo (it
    hid the diagrams); a fixed time per demo (stories of different lengths).
- **2026-10-17 "Gassi gehen": tier texts and the current woods walk in files of their own.** Since another
  session works on the walk screens and their texts tonight, the tier screen's texts are in
  `i18n.tiers.de.ts` / `i18n.tiers.en.ts`, and the walk in the woods being played (so that
  "Weiterspielen" returns there) in `stop.ts`. Fold the texts into `i18n.de.ts` once both are merged.

### Harder tiers ("Gassi gehen", 2026-10-17)

Kevin played "Gassi gehen" and found the walks too easy. The numbers of every walk are in
[`gassi-walks.md`](gassi-walks.md) (written by `scripts/gassi/table.ts`).

- **2026-10-17 (agreed by Kevin 2026-10-18) Three tiers "Leicht", "Mittel", "Schwer".** The hand-made walks stay as
  "Leicht" (six in the park, four in the woods, unchanged; the tutorial hints only there). "Mittel" and
  "Schwer" have four walks in the park and three in the woods each, generated offline. The picker of
  walks gets three tier buttons (it opens on the tier of the current walk; the woods walks of a tier
  below its park walks; one sentence on the tier above the cards), the header reads "Schlosspark ·
  Mittel · Taubenjagd · 1 von 4", and "Nächstes Level" leads easy park → easy woods → medium park →
  medium woods → hard park → hard woods. Stars, leaderboards (`frechet/<id>`, `frechet/woods-<id>`) and
  stored progress work as before. Alternatives: the staff menu's difficulty (it is meant for computer
  opponents, and visitors should choose; the easy start must stay for everyone); replacing the walks
  (Kevin: keep them as the easy start); more hand-made walks (nothing guarantees they are hard for each
  simple strategy).
- **2026-10-17 (agreed by Kevin 2026-10-18) What "hard" means.** Four strategies a visitor might use are played with the
  game's own step at 60 frames per second (`src/core/games/frechet/strategies.ts`): both walk all the
  time; the one behind walks (along the line from the gate to the castle; both when level within
  0.25 m); keep pace by the share of the path walked (both when within 0.25 m of the dog's due
  position); always the move after which the leash is shortest (each of the three moves probed for
  10 cm). A walk is hard when all four snap the leash with its leash length. A careful player follows
  the game's hint (who should walk), but reads it only every 0.25 s; that player must get through.
  Calibration on the easy walks: at their speed of 2.2 m/s the careful player already snaps on "Für
  Profis", "Hinterm Baum" and "Dickicht", at 1.8 m/s on "Slalom" and "Dickicht", at 1.5 m/s on none.
  So the harder tiers walk at 1.5 m/s (a `speed` per walk; the easy walks keep 2.2 m/s), which the
  tier's sentence says ("Beide gehen langsamer, damit du Zeit zum Überlegen hast."). Leash: "Mittel"
  1.15 × the shortest leash in the park and 1.12 × in the woods, "Schwer" 1.08 and 1.06 (the easy
  walks have 1.6 down to 1.08 in the park, 1.35 down to 1.12 in the woods). Alternatives: hard by the
  leash factor alone (at 1.08 some simple strategy still gets through on 370 of the generator's 524
  pleasant pairs, at 1.15 on 436; keeping pace and "the one behind walks" most often); a model of a
  visitor with noise (more parameters to argue about than a hint read every 0.25 s).
- **2026-10-17 Free-space measures** (`src/core/games/frechet/hardness.ts`). On a raster of the
  free-space diagram (positions every 5 cm along both paths for the table, 10 cm while generating; moves
  as in the game: person, dog or both one step): the positions reachable from the start, those from
  which the castle can still be reached, and the dead ones in between, grouped into dead ends
  (8-connected, at least 0.25 m² of the diagram, smaller ones are raster noise), their sizes and their
  share of the reachable positions. "Cells with free space" counts the pairs of segments whose cell
  contains positions within the leash, as the complexity of the free space (at most the product of the
  segment counts). "Changes" counts how often who walks changes on the computer's walk (the offline
  search's walk with the shortest leash and the fewest changes). Finding: within 6–15 % above the
  shortest leash the free space hugs the computer's walk, so it never spreads over most cells: the
  generated walks have free space in 26–54 % of their cells (43–103 of 91–247 cells), the easy walks in
  20–71 % of mostly far fewer (11–67 of 21–323). The maze shows as many dead ends along the way (4–12
  per generated walk, 0–6 on the easy walks) rather than as free space everywhere.
- **2026-10-17 (agreed by Kevin 2026-10-18) The generator** (`scripts/gassi/generate.ts`, seed 20261107, the day of the
  open house; about 16 minutes; the walks go to `src/core/games/frechet/generated.json`, a test checks
  that they still pass). Footpaths and dog's trails between the gate and the castle from three families:
  zigzag, wander (random corners in a band) and meander (sweeps at a given turning angle), with a
  common random bend. Pleasant to look at (`pleasant.ts`, tested): inside the park with a 1.2 m margin,
  at most 20 segments, no segment shorter than 1 m (person) or 0.8 m (dog), the footpath without
  self-crossings or turns sharper than 115°, the dog's trail crossing itself at most once, at most 65 m
  and 85 m long. Of 1600 pairs, those hard in a tier are ranked by 2 × dead ends (up to 10) + 40 × dead
  share + 10 × share of cells with free space + 0.5 × changes (up to 20), at most two of one pair of
  families per tier, "Schwer" first, then "Mittel" from the rest; 524 pairs are pleasant, 242 of their
  1048 (pair, tier) combinations are hard. Alternative tried: interleaved "snake" paths that cross each
  other (long, and still a single corridor in the diagram).
- **2026-10-17 (proposed; superseded 2026-10-18, see "Winding in the woods") Woods: the trees must matter.** Separate pairs (4000) whose dog's trail
  runs out in spikes across and beside the footpath. Places for trunks: points that the straight leash
  of the computer's best walk without trees sweeps over and back (the loop "person's path so far, leash,
  dog's path back, start leash" winds around them at some moment), outside the area the two whole
  paths enclose (there a trunk would catch the leash for good), at least 1.05 m from both paths and
  3 m from the gate and the castle; trunks of radius 0.6 m. Up to three trunks are added greedily, each
  round the place that best serves both conditions: the shortest leash in the woods at least 1.12 ×
  the one without trees, and the computer's best walk without trees needing at least 1.13 × that in the
  woods. A walk is kept when, with its tier's leash, the walk without trees needs at least 5 % more
  than the leash (it clearly snaps on a trunk: a first run accepted three walks where it needed only
  5–15 cm more, which a player copying the walk from the park would not notice), all four strategies
  snap and the careful player gets through; ranked as in the park plus 20 × (shortest in the woods /
  without − 1); all six chosen walks have a single tree. "Mittel" is chosen first here: with its
  looser leash fewer walks qualify (some simple strategy gets through more often), and choosing
  "Schwer" first left it only weak walks. First attempt: the park's pairs with trunks on the
  computer's leash at its narrowest moment; no walk passed, since those places lie inside the enclosed
  area.

### Winding in the woods ("Gassi gehen", 2026-10-18)

Kevin, after playing the new tiers: better, but not stunning yet; above all, the leash never really
winds round a tree, which is the point of the homotopic Fréchet distance. Measured on `main` (d6dfe48):
the trunks (octagons of radius 0.45–0.6 m, 2.8–3.7 m round) were longer round than the leashes (2.2–2.7
m), so the leash could bend round a trunk but never wind; along the computer's walks the leash turned at
most 65° round a trunk; in three easy walks the trees did not change the best walk; at 1280 × 800 the
park was drawn at about 27 px per metre (a 2.7 m leash was a 70 px line). Background: Chambers, Colin de
Verdière, Erickson, Lazard, Lazarus and Thite, "Homotopic Fréchet distance between curves, or walking
your dog in the woods in polynomial time", CGTA 43(3), 2010.

- **2026-10-18 (agreed by Kevin 2026-10-18) Thin posts, coils and how they are counted.** Trunks come in three kinds
  (`kind` in the walk data, only the look differs): old trees (radius 0.55–1 m; the leash can only bend
  round them), lamp posts and young birches (0.1–0.18 m; a 0.15 m post is 0.9 m round, so a leash winds
  round it several times). How often the leash is wound round a trunk is the winding number, round the
  trunk's centre, of the loop "along the leash from the person to the dog, then straight back"; it
  counts as a coil (badge, hint, snap message) only when the leash also wraps at least half way round
  that trunk (otherwise a leash that merely bends round the far side of a thick trunk, or just passes a
  post, would read "1×"). Drawing: each turn lies 5.5 px further out than the last (a small spiral, so
  two or three turns can be counted), thin posts at least 5 px in radius, a badge "2×" with a round
  arrow for the direction at the post, and the hint "Leine 2× aufgewickelt! Die Leine ist 2× um den
  Pfahl gewickelt." Lamp posts get a side-view lamp (as the map's other icons), birches a small crown.
  Alternatives: count contact angle only (a leash wound twice round a thin post touches it only 1.1
  turns: the straight legs to person and dog cover the rest); count every winding (see above).
- **2026-10-18 (agreed by Kevin 2026-10-18) New easy woods walks.** "Laternenpfahl" (dog and person loop two and a half
  times round a lamp post, the dog close to it; leash 3.4 m: with the dog a whole loop ahead from 3.1 m,
  wound twice from 3.7 m, so one coil fits and two do not), "Vor dem Bäcker" (the dog was tied to a post
  outside the bakery and ran round it twice: the leash starts wound twice, 3.0 m of 3.6 m, and the dog's
  trail first unwinds it; a house replaces the gate), "Hinterm Baum" (kept: catching on the thick beech
  is expensive) and "Achterbahn" (a figure-eight round a lamp post and a birch, both the same way; one
  coil round either fits). They replace "Um die Eiche", "Slalom" and "Dickicht" (new ids, so their
  leaderboards start empty). The two coil walks have a leash chosen by hand (`leash` in the data); a
  test checks with the offline search that one coil fits with 0.3 m to spare and two do not (the search
  can require a coil: an extra bit in its state). The wound start is the dog's way just before the walk
  (`before`), carried from a straight start with the game's own rope update, so the grid of positions,
  the search (it takes the start rope) and the hints are unchanged. The woods' "So geht's" shows a leash
  coiling round a lamp post and coming free. Alternatives: keep the oak walk with a thinner oak (an oak
  is not thin), a fixed wound start stored as a word (the rope update could not draw it).
- **2026-10-18 (agreed by Kevin 2026-10-18) A camera for the walks.** In the park and in the woods the board follows
  person and dog: zoomed in so that the leash is about 220 px long while the view still spans 2.4
  leashes plus 3 m (geometric mean of its sides, so a tall phone screen zooms in too; at least 1.3 times
  the zoom of the whole park; none when that would hardly differ), looking a few metres ahead along both
  paths, both walkers at least a fifth of the view from its edges, smoothed with a time constant of
  0.4 s. A small overview map in the lower left shows the whole route, both positions, the castle and
  the view. The theory view and the explanation keep the whole park (the board fits the screen and turns
  on phones as before; while following, it is not turned). Technique: the park is drawn once at the
  camera's zoom on a stage larger than the screen and moved with a CSS transform written every frame,
  so following needs no re-render and no repaint of the scenery (60 frames per second in the cloud
  session). Footpaths are at most 24 px wide when zoomed in. Alternatives: changing the board's viewBox
  every frame (every frame repaints the whole park with its ink filters), zooming only near trunks.
- **2026-10-18 (agreed by Kevin 2026-10-18) A livelier leash.** The leash is drawn with its real length: slack, it hangs
  down on screen in a soft curve (a cubic Bézier whose sag is found by halving so that its length is the
  leash's; in the woods the slack goes into the two free ends); from 85 % of its length it is
  orange-red; from 95 % it trembles (up to 2.2 px, not with reduced motion). When it is taut the dog
  leans into it (up to 16°) and the person leans back (12°). When it snaps it breaks in the middle, the
  halves spring back to a quarter of their length and lines flash at the break (650 ms, before the
  dialog). The same leash is used in the park, the woods, "Schätz die Leine" and the sandbox.
- **2026-10-18 (agreed by Kevin 2026-10-18) The free start leash ("Schwer", woods).** On two hard woods walks the dog
  first runs two or three times round a post at the gate. Before the first step, a panel at the top of
  the park asks "Wie liegt die Leine am Start?": two round-arrow buttons wind the leash one more turn
  round the gate post either way (−3 … 3), shown on the board and with the start length ("Leine am Start:
  4,1 m"). Only the start that the dog's loops unwind leaves the leash free; with any other the leash
  stays wound round the gate post for good. The target is the minimum over the seven starts (one offline
  search each, all stored with their computer's walks); stars and leaderboard use it. While the start
  is chosen there is no dead-end banner (it would give the answer away); the how-to says "Schau dir den
  Weg des Hundes an!". The theory panel shows a bar chart "Kürzeste Leine je Startlage" (the best start
  green, the leash as a dashed line, bars far above it cut with a zigzag; "beste" and "deine" under the
  bars), and "Was steckt dahinter?" adds: "Der homotope Fréchet-Abstand ist die kürzeste Leine über alle
  Arten, wie sie liegen kann." Alternatives: drag the dog round the post (harder on a touchpad, no fixed
  steps), any start winding round any tree (too many choices for a visitor).
- **2026-10-18 (agreed by Kevin 2026-10-18) "Mittel" and "Schwer" in the woods, regenerated so that winding matters**
  (`scripts/gassi/woods.ts`, called by `generate.ts`; `GASSI_ONLY=woods` keeps the park's walks, which are
  unchanged; seed 20261108; about 20 minutes for 1000 designs). A design has one or two sites round thin
  posts: "shared" (both loop round the post the same way, the dog close to it, the person on a wider
  loop: keep pace or the leash coils) or "fetch" (the post stands about 2 m beside the footpath; the dog
  runs round it, fetches something behind it and runs back round it the other way, so the leash is
  coiled round the post in between whatever the timing, and the post makes the shortest leash longer);
  on "Schwer" designs with a free start the dog first runs two or three times round a post at the gate.
  Between the sites the dog runs out to the sides, leaning forwards or backwards (so that "the one
  behind walks" does not keep them in step). The runs are tuned per design: as far as the posts still
  make the shortest leash 16 % longer than without trees (with a free start: as far as the rest of the
  walk needs at most 3 % more leash than the wound start), so that coils and runs are both tight. Then
  one to three thick trees (radius 0.6–0.95 m) and up to two more posts are added where the leash of the
  computer's walk without trees sweeps over and back, or else beside the paths outside the area they
  enclose (3–8 trunks in all). A walk is kept when: the shortest leash in the woods is at least 15 % above
  the Fréchet distance without trees; winding matters (the computer's walk wraps the leash a full turn
  round a post, or at least three of the four simple strategies coil it round a post before they snap);
  every simple strategy snaps the leash and the careful player gets through (as in the park, at 1.5 m/s);
  at least three dead ends; legible paths (inside the park 0.7 m from its edge, no segment under 0.3 m,
  loops only round posts: away from the posts the footpath does not cross itself and the dog's trail at
  most once, no trunk within 0.3 m of a path); with a free start, the straight start needs at least 30 %
  more leash. Ranked as in the park plus the coils; "Schwer" first (two walks with a free start, one
  without), then "Mittel". Result (table in `gassi-walks.md`): the computer's walk wraps the leash
  394–400° round a post on the four fetch walks and 857–860° on the two free starts (the leash starts
  wound three times round the gate post: 4.3 and 4.4 m, every other start 65–73 m), the shortest leash
  is 18–35 % above the Fréchet distance, 3–6 dead ends, every strategy snaps (most after coiling the
  leash), the careful player arrives. New names: "Laternengasse", "Stöckchen am Pfahl", "Waldrunde",
  "Am Tor angebunden", "Torpfosten", "Fuchsbau" (the old walks' leaderboards are orphaned). The searches
  for the other starts of a free start sample every 15 cm (with a wrong start the leash stays wound and
  the search meets every state: 2.5 minutes each at 5 cm). Alternatives: the old generator with posts
  added (posts beside a path only bend the leash), thick trees only where the leash sweeps (with these
  paths the computer's walk without trees hardly sweeps outside the enclosed area).
- **2026-10-18 (agreed by Kevin 2026-10-18) "Kürzere Leine".** After a finished walk (park and woods, not the sandbox),
  the result offers the same walk with a shorter leash: "Geschafft mit 3,6 m – traust du dich mit 3,3
  m?", 0.3 m shorter each time (rounded down to 0.1 m), down to 10 cm above the shortest leash; after
  that step a badge "Leinen-Profi!". Stars and leaderboard work as before (the leaderboard ranks the
  longest leash needed, which a shorter leash keeps short). Not done of the optional ideas: the leash
  holding instead of snapping, the sandbox in the woods, colouring the diagram by turns round a post.

### Kevin's review (2026-10-18)

Kevin went through the 19 "proposed" entries above on 2026-10-18: 18 are agreed (marked so in place),
the QR poster and card rejected and removed.

- **2026-10-18 Tags only mark booth releases** (Kevin). `phase-6` is the laptop test (created
  2026-10-18 on `8a15816`), `phase-7` the feature freeze, `phase-7.1`, `phase-7.2` … later fixes. Kevin or
  Maike create them on the Releases page, which starts "Booth package" and attaches `Stand-<tag>.zip` to
  the release; sessions never create or ask for tags. This replaces "a tag `phase-<n>` after the last
  merge of each phase". The laptop checklist loads `phase-6`, the cheat sheet the newest `phase-7…`.
- **2026-10-18 (agreed by Kevin 2026-10-18; the round from the castle proposed) A free start that is a
  real trade-off: "Schlossrunde".** Kevin asked for one more "Schwer" woods walk where at least two,
  better three start windings work with clearly different shortest leashes: the best not the straight
  one, the straight one at least 15 % longer, a third at most 1.5 times the best, so that the bar chart
  compares something, as Figure 5 of Chambers et al. does. No walk from the gate to the castle can do
  that. How the leash lies round the gate post at the start fixes how often it goes round that post for
  the whole walk (the start, the two paths so far and the leash bound a disc in the woods), so at every
  moment two starts differ by at least one turn round the post; where both walkers are far from the post,
  at most one of them can be short: a leash that goes round a post 30 m away is 60 m long. At the castle
  all starts but one need some 65 m, as the bars of "Am Tor angebunden" and "Torpfosten" show (65–73 m).
  Several starts can only work on a walk that stays near the post. So "Schlossrunde" (`ws4`, the last
  walk of "Schwer", the fourth woods walk there) is a round from the castle back to the castle about a
  post beside the castle gate: the person walks one round about the post (2.8 m out), starting 0.9 m
  from it and ending 2.3 m out; the dog stays about a metre from the post and runs three laps round it,
  twice running out to the side (up to 2 m). One lap goes with the person's round, two are extra. Wound twice
  against them at the start (the best start, "2× gegen den Uhrzeigersinn"), the leash is unwound by the
  dog's first laps while the person still stands at the post: 3.45 m, and that is the wound start leash
  itself, which the panel shows while the player chooses ("Leine am Start: 3,4 m"). Straight, the dog
  must run its extra laps at the end, when the person is 2.3 m out: 4.72 m (+37 %). Wound once: 3.92 m
  (+14 %), three times: 4.22 m (+22 %); the other way round 5.5–7.1 m. With the walk's leash (3.7 m) only
  the best start gets through. Without trees 2.14 m would do. The walk passes the checks of the other
  woods walks: every simple strategy snaps (all four after coiling the leash), the careful player
  arrives, 4 dead ends, the computer's walk wraps the leash 568° round the post, legible paths, stored
  targets equal to a fresh search. A beech and a birch beside the round (3 trunks, as on every generated
  woods walk) change none of the shortest leashes. On the board: no gate, the castle's label reads "Start
  und Ziel", the how-to says "…wie die Leine um den Pfosten am Schloss liegt. Schau dir an, wo der Hund
  seine Runden dreht!". Generated by `scripts/gassi/tradeoff.ts` (seed 20261109, 300 designs, about five
  minutes; 12 passed, ranked by how clear the trade-off is, then as in `woods.ts`), written into
  `generated.json` beside the other walks, which stay unchanged. Alternatives: a round from the gate back
  to the gate (every text names the castle as the goal); a walk from the gate to the castle with a weaker
  rule (any second start still needs some 65 m); a long obstacle such as a hedge, round whose two ends
  the leash could go (as the paper's polygons; a new kind of obstacle for the rope and the search);
  replacing one of the two free-start walks (four woods walks in "Schwer" are not too many: eight walks in
  all, as in "Mittel" with seven).

### Kevin's playtest (2026-10-19)

Kevin played `main` at `8f4d3e2` and decided the following on 2026-10-19.

- **2026-10-19 (agreed by Kevin 2026-10-19) "Kreuzungen": a new first map, "Gabel".** The how-to's
  animation (a castle above two villages, joined at one junction) was exactly map 1 ("Dreieck") with its
  solution, so the how-to solved the first map. The animation stays; map 1 is now a fork with a road
  straight on: two villages on the left joined at a junction, which leads on to the castle in the middle,
  and from the castle a road without a junction to a village on the right (the angle at the castle is
  wider than 120°, so no junction helps there). Four places, one junction 1.5 units from every place, the
  network without junctions 8.5 % longer (the old triangle: 14.4 %); it also shows early that not every
  place needs a junction. The optimum comes from `scripts/roads/steiner-maps.ts` as the other maps'
  (every full topology, Smith's iteration); the how-to's picture moved to `STEINER_HOW_TO` in
  `src/core/games/roads/levels.ts`, and a test checks that map 1 has more places than it and a road from
  place to place. The old map's leaderboard (`roads/steiner/1-dreieck`) is orphaned. Alternatives: the
  triangle turned or mirrored (still three places round one junction, the same picture); a different
  how-to picture (Kevin wanted the animation kept).
- **2026-10-19 (agreed by Kevin 2026-10-19) "Kreuzungen": the junctions settle only very close to the
  optimum.** On a win the junctions slid to their best spots, and with the 1 % tolerance this happened as
  soon as a network was roughly right, so it looked like snapping to the solution. 1 % stays the win; the
  junctions now settle only when the network is at most 0.03 % longer than the optimum
  (`SETTLE_TOLERANCE` in `src/core/games/roads/junctions.ts`); between that and 1 % the network counts as
  optimal, but the junctions stay where the player put them, with their angles as they are. Tuned on the
  six maps by moving the optimum's junctions in random directions until the network is a given share too
  long: at Kevin's starting value of 0.2 % the worst angle at a junction is typically still 10–13° off
  120° (up to 21° on "Wabe", whose junctions have short roads between them), and a junction moves up to
  0.3 units when it settles; at 0.03 % the worst angle is typically 4–5° off (at most 4.4° on "Gabel", 7.6°
  on "Wabe"), and a junction moves at most 0.1 units (a map is about 6 wide; 10–20 px on the laptop).
  The angle labels lead there: each degree off is a few pixels. Tests: every map at the threshold
  (median worst angle at most 5.5°, at most 8.5°, junctions within 0.12), a network between the two
  thresholds counts but does not settle, and the smoke test plays both. Alternatives: a rule on the
  angles instead (Kevin asked for one on the length, which is what the king pays); 0.05 % (angles
  typically 5–6.5° off, up to 10°).
- **2026-10-19 (agreed by Kevin 2026-10-19) "Licht ins Verlies": the dark-spot marker only from 95 % lit
  on.** The pulsing marker on the thickest dark spot gave away where the next torch belongs. It now
  appears only once at least 95 % of the floor is lit and the dungeon is still not fully lit by the
  thickness rule (`DARK_HINT_FROM`, `showsDarkHint` in `src/core/games/art-gallery/coverage.ts`), so it
  helps to find the last dark corners. 95 % is the lit share shown above the board (rounded down, so the
  marker appears from "95 %" on). The attract demo keeps its marker before the last torch. Alternatives: a
  marker on request (a hint button; the game has none so far); a share relative to the torches still to
  place (harder to explain).
- **2026-10-19 (agreed by Kevin 2026-10-19) "Licht ins Verlies": rock around the dungeon and in the
  pillars, and "Mittel" starts with small pillars.** On "Mittel 1" (a narrow corridor round three large
  pillars) inside and outside were hard to tell apart: the unlit floor is dark, while pillars and the
  outside were lightly hatched, so the corridor looked like a wall and the pillars like rooms. The
  outside and the pillars are now rock, only somewhat darker than before (Kevin): stone colour `#e2dbce`
  instead of `#efebe2`, under groups of four to six short ink strokes in random directions, as rock is
  drawn on hand-made dungeon maps, instead of even diagonal hatching that read like fabric. The tile
  (`src/ui/games/art-gallery/rock.svg`, 144 px, seamless) is drawn by `scripts/art-gallery/rock-tile.ts`
  (seeded; a test checks the committed file and that it is seamless), our own art, so nothing new in
  CREDITS.md. The floor with its grid stays as it is. The same rock is behind the dungeon in the game
  (also in the theory view), in the explanation's animations and in the attract demo. "Mittel" now
  starts with agLevel4_8 (the mockup's dungeon, 6 pillars, the largest 36 % of the floor, three small
  diamonds), then agLevel8_4 (no pillars), then the corridors round large pillars by torches: agLevel10_4
  (53 %), agLevel5_5 (58 %), agLevel12_7 (45 %); a test checks that the first has the smallest pillars.
  "Mittel 1" now asks for 8 torches. The contrast checks of `e2e/a11y.spec.ts` stay green. Alternatives:
  a darker even hatching (still read like fabric, see the screenshots of the session); moving
  agLevel2_3 (3 small pillars, "Leicht 4") to "Mittel" (Kevin asked to reorder "Mittel"); agLevel8_4
  first (no pillars at all).
- **2026-10-19 (agreed by Kevin 2026-10-19) "Rasenmähen": a button "↶ Zurück" on each mower's card.** The
  step back was not recognisable (only the key Q with a small curved arrow on the card). Each card now
  has a button with the curved arrow, "Zurück" and its key as a keycap ("Q", "Rücktaste" for mower 2),
  in the top row of the keys, where Q sits beside W; it works with the mouse as well as the key, is
  disabled while the mower has not moved, and does not take the focus (so the space bar stays
  "Feierabend"). The keys stay, and phones keep the middle of the direction pad. The shared key label of
  Backspace is now "Rücktaste" (English "Backspace") instead of "Rück", also in "So geht's" and the key
  test. The four cards still fit side by side at 1280 px. Alternatives: a separate button column beside
  the keys (the cards would no longer fit side by side at 1280 px); the button below the card's steps
  (the card would grow taller than the "Feierabend" card).
- **2026-10-19 (agreed by Kevin 2026-10-19) "Rasenmähen": the explanation plays an example lawn.** "Was
  steckt dahinter?" after a finished lawn played the solver's tours on that very lawn, so it showed the
  solution of a level. It now plays the computer's tours on a small example lawn that is none of the booth
  lawns (16 × 9 cells with a notch and a 3 × 3 patch inside, 125 cells to mow), with one mower or two, as
  the visitor played, labelled above the picture: "Beispiel – ein kleiner Rasen: So mäht der Computer mit
  einem Mäher, 46 Schritte." The text keeps this lawn's numbers: the lower bound, the visitor's longest
  round and the computer's ("…mindestens 100 Schritte. Du hast 124 gebraucht, der Computer 110."). The
  example's tours come from the same offline solver as the booth lawns (`scripts/lawns/solve.py
example_1s3 example_2s3`, instances from `levels/lawn-mowing/example/lawn.txt` by `make_instances.py`):
  one mower 46 steps, equal to its lower bound; two mowers 26, lower bound 24. `npm run levels` imports
  it as `lawn-mowing/example` (flagged `example`, like the competition instance; not in any tier), and a
  test checks that it is small, has tours for one and two mowers and differs from every booth lawn. The
  theory view's "Runden ansehen" still plays this lawn's tours on demand. Alternatives: an animation of
  the lower bound only (no tours; the tours are what the computer is good at); the strips on this lawn
  (also a solution of the level, if a poor one).
- **2026-10-19 (agreed by Kevin 2026-10-19) "Rasenmähen": every hole is stone slabs.** Several visitors
  thought a mower cannot drive through a tree or the pond and steered round them. Every non-lawn cell
  inside a lawn is now drawn as stone slabs, which one can obviously drive over: one slab per cell in
  three stone tones, a joint of mortar round it, inked edges and a crack in some (our own SVG, so no new
  art files; the pond, tree and flower-bed tiles of Scribble Dungeons left CREDITS.md). A hole's outline
  is thinner than the lawn's (a paving's edge, not a wall). The shapes are unchanged, so are the instances
  and the solver's tours; a hole is a terrace, a paved path or a small paved square by its shape (the
  rule that made it a pond, a flower bed or a tree), and `lawns.txt` marks them T, W and S. Two lawns
  were named after what they no longer have: "Gemüsegarten" is now "Gartenwege" (six paved paths) and
  "Obstwiese" "Trittsteine" (13 small paved squares; English "Garden Paths", "Stepping Stones"). The
  same look is in the how-to animation (tier screen and "So geht's": its lawn has a 2 × 2 terrace that
  the first strip drives straight over), the theory view, the explanation, the attract demo and the
  lawns in "Neu" (there as the stone colour only). The texts say it: "Steinplatten musst du nicht mähen,
  drüberfahren darfst du." Alternatives: the Scribble floor tiles (white with pale grey joints, they look
  like the grid paper round the lawn); keeping trees and ponds with a hint that mowers drive over them
  (the picture says otherwise).
- **2026-10-19 (agreed by Kevin 2026-10-19) "Erobere das Land": the castle count on phones.** The header
  drops its subtitle on narrow screens (phones, windows up to 720 px), so "Burg 3 von 10" was missing,
  which players want to know. There it now follows whose turn it is, in the line above the hint: "Du bist
  dran · Burg 3 von 10" (also "Computer überlegt … · Burg 3 von 10"); wider screens keep it in the
  subtitle only. Alternatives: keeping the subtitle on phones (the header would take a third line); the
  count in the score cards (it belongs to the round, not to a player).
- **2026-10-19 (agreed by Kevin 2026-10-19) "Rasenmähen": the score card says "Bisher" and "Computer".**
  "Deine Runde" was confusing. The score card now reads "Bisher: 12 Schritte" with one mower and
  "Längerer Mäher: 12 Schritte" with two (the steps so far with the way back, as before), and "Computer:
  110 Schritte" instead of "Ziel vom Löser: 110", since the app calls the solver "der Computer" elsewhere
  too (also on the phone beside the direction pad, on the result screen, and in the "Schwer" teaser of
  the tier screen; the theory view still names "den Löser des Lehrstuhls"). Without the solver's tours
  the line would read "Streifen-Strategie: 74 Schritte". It fits on phones (390 px) and the four cards
  still fit side by side at 1280 px (both tested). Alternatives: "Deine Runde bisher" (longer, and with
  two mowers it is not one round).
- **2026-10-19 (agreed by Kevin 2026-10-19) "Rasenmähen": mowed and unmowed clearly different.** Above all
  on phones it was hard to see where the lawn was already mowed: the uncut grass (green under the white
  Scribble grass tile at 55 %) came out almost as pale as the mowed cells. Uncut grass is now a darker,
  fuller green (`#5d9f3c`, grid lines `#4c8a2f`) with two tufts of dark green strokes per cell, drawn in
  SVG instead of the Scribble tile (which only whitened the green; it left CREDITS.md); mowed cells are
  clearly lighter (`#dbf0c4`, stripes `#c9e6aa`) and keep their stripes, so colour is not the only cue
  (tufts on uncut grass, stripes on mowed). The same colours in the how-to, the theory and explanation
  animations, the attract demo and the lawn cards (`LAWN` in `src/ui/games/lawn-mowing/art.ts`).
  Checked at 390 × 844 (screenshots of the session); the contrast checks of `e2e/a11y.spec.ts` stay
  green (no text lies on the lawn). Alternatives: the Scribble tile multiplied onto the green (a blend
  mode inside an SVG pattern, untested in WebKit); only a darker mowed colour (the mowed area would read
  as the important part).

### Kevin's playtest (2026-10-20)

Kevin played "Straßenbau" and "Rasenmähen" again and decided the following on 2026-10-20.

- **2026-10-20 (agreed by Kevin 2026-10-20) "Straßenbau": equally short networks count, up to the
  rounding of the coordinates** (a bug). Map 6 of "Von Ort zu Ort" (`kings-taxes/tsp/ktLevel2`) has
  several shortest networks; the rounding of the level coordinates makes two of them 1.7e-8 and 3.7e-8
  longer than Kruskal's tree (and both swaps together 5e-8). `isOptimal` compared with a tolerance of
  1e-9, so such a network was refused, and `percentOver` rounded the difference up to "+0,1 % über dem
  Optimum" (a visitor sent exactly this screenshot). Lengths are now equal up to a relative 1e-6
  (`LENGTH_TOLERANCE`, `atMost` in `src/core/games/roads/mst.ts`), in `isOptimal`, in the hints' cycle
  property and in "Zwei Sorten" (`isPlaneOptimal`, which used 1e-6 already); `overOptimum` is 0 within
  it, so an optimal network can never read "+0,1 %". Checked: on the eight maps every tree one road away
  from the shortest is either as short up to rounding (map 6 twice, map 8 once, an exact tie) or at least
  0.23 % longer (a test); in "Zwei Sorten" the stored optima differ from the computed lengths by at most
  4e-8 and the closest plane network one road away is 0.42 % longer; on 3,000 random maps none of 565,730
  such trees lies within 1e-6, the closest is 3e-6 longer (a real difference). "Kreuzungen" compares
  with a percentage anyway. Tests: map 6's three other shortest networks count, get no hint and no "+x %".
- **2026-10-20 (agreed by Kevin 2026-10-20) "Straßenbau": up to 0.5 % longer counts in "Von Ort zu Ort"
  and "Zwei Sorten".** A network only a few tenths of a percent longer than the shortest cannot be told
  apart by eye (on maps 5–8 of "Von Ort zu Ort" the next-best networks are 0.24–0.56 % longer; in "Zwei
  Sorten" the closest plane network one road away is 0.42 % longer on "Mark"). In "Von Ort zu Ort" (fixed
  maps and random villages) and in "Zwei Sorten", a network at most 0.5 % longer than the optimum now
  counts as optimal (`NEAR_OPTIMAL` in `src/core/games/roads/mst.ts`, passed to `isOptimal` and
  `isPlaneOptimal`), as "Kreuzungen" did with 1 %. If it is not exactly the shortest, the result says so
  below the numbers: "Optimal! Nur 0,5 % länger als das kürzeste Netz – mit bloßem Auge kaum zu sehen."
  (the share rounded up to a tenth, as in the header), and the explanation shows the shortest network as
  before. Hints, stars and leaderboard are unchanged (the hints still lead to the shortest network).
  Tests: every network one road away on maps 5–8 counts exactly when it is at most 0.5 % longer; in "Zwei
  Sorten" "Mark"'s 0.42 % network counts and "Königreich"'s 0.84 % one does not; the smoke test plays
  map 5 with its 0.45 % network. Alternatives: 0.2 % (the next-best networks of maps 7 and 8, 0.23–0.24 %
  longer and just as invisible, would still be refused); counting it with one star less (Kevin: stars
  unchanged).

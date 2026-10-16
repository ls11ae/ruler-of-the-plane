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
  chunk. Manifest with `display: fullscreen`; the app icon is a compass rose drawn for this repository.
  Alternative: a hand-written service worker. Reason: the plugin knows the hashed file names.
- **2026-10-16 English names of the places** (shown with the language switch): "Light the Dungeon",
  "Conquer the Land", "Walk the Dog", "Mow the Lawn", "Road Works", "Old Ruins", "Round Trip". The map
  subtitle reads "Hands-on geometry – pick a place on the map".
- **2026-10-16 Logo placeholder**: the text "TU Dortmund · Informatik · LS 11" at the bottom of the start
  map until the logos are provided.

### Track A ("Erobere das Land", "Rasenmähen")

### Track B ("Gassi gehen", "Straßenbau")

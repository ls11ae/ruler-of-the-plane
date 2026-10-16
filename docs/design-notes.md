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

### Track A ("Erobere das Land", "Rasenmähen")

### Track B ("Gassi gehen", "Straßenbau")

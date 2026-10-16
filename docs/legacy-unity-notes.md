# Notes on the Unity version (reference for the port)

What the Unity project in `github.com/kbuchin/ruler` does, so the web port does not need to re-read the
C# code. State: `master` at b2d1a2d (last code change 2020-03-12, Unity 2018.2.6f1). Paths below are
relative to `unity/Assets/` in that repository unless stated otherwise. If you need the C# code itself,
clone the public repository (GitHub is reachable from cloud sessions); do not copy code from it.

The level files and the in-game texts are copied into this repository (Unity `.meta` files left out):

| Unity path                                   | Copy here                                           |
| -------------------------------------------- | --------------------------------------------------- |
| `ArtGallery/Levels/*.ipe`                    | `legacy/levels/ArtGallery/`                         |
| `KingsTaxes/Levels/MST/`, `TSP/`, `Spanner/` | `legacy/levels/KingsTaxes/MST/`, `TSP/`, `Spanner/` |
| `Divide/Levels/` (`.ipe` and `.asset`)       | `legacy/levels/Divide/`                             |
| `ConvexHull/Levels/` (`.ipe` and `.asset`)   | `legacy/levels/ConvexHull/`                         |
| `ingameText.md` (repository root)            | `legacy/ingameText.md`                              |

The in-game texts (English) are the starting point for the German texts, not a template to translate
literally.

## Overview

| Game (menu name)                   | Scenes                                 | Controller                                              | Levels                              |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------- | ----------------------------------- |
| Illuminate (art gallery)           | `ArtGallery/Scenes/ag*.unity`          | `Scripts/ArtGallery/Controller/ArtGalleryController.cs` | 14 `.ipe`                           |
| Conquer (Voronoi game)             | `Voronoi/Scenes/voronoi*.unity`        | `Scripts/Voronoi/Controller/VoronoiController.cs`       | none (free play)                    |
| Connect (MST, t-spanner, TSP)      | `KingsTaxes/Scenes/{MST,Spanner,TSP}/` | `Scripts/KingsTaxes/Controller/*.cs`                    | 4 + 4 + 3 `.ipe`, plus endless mode |
| Divide (ham sandwich)              | `Divide/Scenes/Divide*.unity`          | `Scripts/Divide/Controller/DivideController.cs`         | 9 (3 `.asset`, 6 `.ipe`)            |
| Convex hull (not in the main menu) | `ConvexHull/Scenes/hull*.unity`        | `Scripts/ConvexHull/Controller/HullController.cs`       | 3 (2 `.asset`, 1 `.ipe`)            |
| Dots & Polygons (branch only)      | branch `MultiThreadedalfabeta`         | `Scripts/DotsAndPolygons/` on that branch               | generated                           |

The geometry library is `Scripts/Util/` (about 11,200 lines): float `Vector2`, `MathUtil.EPS = 1e-4`
applied to squared distances (points within 0.01 count as equal), no exact predicates. Do not port it;
use the libraries named in `CLAUDE.md`.

## Level files (IPE import)

Importer in Unity: `Scripts/Editor/LoadLevelEditor.cs`. The file name selects the game and one optional
parameter after an underscore:

| File name             | Game        | Parameter after `_`                        | Content of the IPE page                                                        |
| --------------------- | ----------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| `agLevel<n>_<k>.ipe`  | art gallery | k = number of torches (int)                | paths; the largest-area path is the outer boundary, all others are holes       |
| `ktLevel<n>_<t>.ipe`  | Kings Taxes | t = spanner ratio (float; class default 1) | markers: `disk` = village, `square` = castle                                   |
| `divLevel<n>_<s>.ipe` | Divide      | s = allowed swaps (int, default 0)         | markers: `disk` = spearman, `square` = archer, `cross` = mage; each count even |
| `hullLevel<n>.ipe`    | convex hull | –                                          | markers: `disk`                                                                |

- Coordinates are centred and scaled so the larger side of the bounding box is 9 (art gallery), 6 (Kings
  Taxes, hull) or 5 (Divide) units. Art-gallery polygons are made clockwise.
- Art gallery checkpoints: all polygon vertices plus the points of a 50 × 50 grid inside the polygon.
- Bugs to avoid in the new importer: `float.Parse` / `float.TryParse` without an invariant culture
  (lines 93, 105–106, 222, 340–347: on a German system "28.1853" becomes 281853 and t = "1.5" becomes 15);
  the IPE `matrix` is applied with the already transformed x when computing y (wrong for rotations).
- Pitfalls in the data: `agLevel14_17.ipe` contains a path with only 2 vertices (ignore paths with fewer
  than 3); the folders `KingsTaxes/MST/`, `TSP/` and `Spanner/` reuse the file names `ktLevel1…`, so key
  levels by folder; five levels exist only as Unity `.asset` YAML (`legacy/levels/Divide/divLevel1_0`,
  `divLevel2_0`, `divLevel3_2`, `legacy/levels/ConvexHull/hullLevel1`, `hullLevel2`).
- The IPE files also contain a style sheet with symbol definitions (`<symbol>` elements with paths);
  read only the paths and markers inside `<page>`.

Level order in the scenes:

- Art gallery (torches): 1_3, 2_3, 3_2, 4_8, 5_5, 6_3, 7_13, 8_4, 9_12, 10_4, 11_14, 12_7, 13_4, 14_17.
  Levels 2, 4, 5, 7, 9, 10, 11, 12 and 14 have holes; 1, 3, 6, 8 and 13 are simple polygons. k is the
  level designer's number, not a proven minimum.
- MST: ktLevel1–4. Spanner: ktLevel1_1.5, 2_1.7, 3_2, 4_1.5. TSP: ktLevel1–3.
- Divide: divLevel1_0, 2_0, 3_2 (`.asset`), 4_0, 5_0, 6_1, 7_2, 8_0, 9_1 (`.ipe`).

## Illuminate (art gallery)

- Click inside the dungeon to place a torch (only while fewer than k are placed); drag a torch to move
  it; release outside the dungeon to remove it. HUD: time, "Puzzle i / 14", "Torches left".
- Visibility per torch: `Util/Algorithms/Polygon/VisibilitySweep.cs` (angular sweep, handles holes).
- Win check (`CheckSolution`): only when exactly k torches are placed; every checkpoint must be inside
  some visibility polygon; then the area of the union (Martinez, `UnionSweepLine`) divided by the level
  area must be at least 1 − 0.001·k. On failure an uncovered checkpoint is marked.
- Known bugs: fewer than k torches never win; the "Advance" button is never disabled again after a
  win; visibility and a new mesh plus material are recomputed every frame while a torch is selected and
  the old ones are never destroyed (leak); collinear cases can produce wrong visibility polygons.
- Old level 10 (137 vertices, 16 torches) was removed in 2020 because it was too slow.

## Conquer (Voronoi game)

- Two players at one device: blue (player 1) starts, then alternate; 5 or 10 castles each ("5-turn" /
  "10-turn game"). A click places a castle; a click within 0.01 units of an existing castle is ignored.
- Score: area of each player's Voronoi cells clipped to the visible board rectangle, shown live in %.
- After the last castle the next click opens the victory screen; a tie counts as a win for red.
- Keys C, E, V toggle circumcircles, Delaunay edges and the Voronoi diagram.
- Delaunay: incremental with a super-triangle at ±999 and linear point location
  (`Util/Algorithms/Triangulation/Delaunay.cs`); Voronoi as its dual (`Util/Algorithms/DCEL/Voronoi.cs`).
- Castles turn to face the nearest enemy castle (`FishManager.cs`): a nice touch worth keeping.

## Connect (Kings Taxes: MST, t-spanner, TSP)

- Drag from one settlement to another to build a road; click a road to remove it. Villages and castles
  differ only in look. Settlement radius 0.6 units.
- MST: the level is won when the player's edge set equals the MST computed by Prim
  (`Util/Algorithms/Graph/MST.cs`). No length is shown at any time. With ties, a different optimal tree
  would not be accepted.
- t-spanner: target = total length of the greedy t-spanner (+0.0001). A text field shows the current
  dilation, the length and the greedy length; hints show a pair that violates the spanner property
  (⌊0.5·√n⌋ hints per level); best scores per level in PlayerPrefs.
- TSP: the tour must be Hamiltonian and shorter than `TSP.FindTSPLength` + 0.0001. That value is the MST
  weight plus a greedy (not minimum) matching on the odd vertices, without shortcutting, although the UI
  calls it "Christofides". Replaced by a link to tsp-boards.
- Endless mode (after all levels are beaten): random levels with level + 3 settlements; spanner t = 1.5.

## Divide (ham sandwich)

- Three kinds of soldiers (spearmen, archers, mages), each with an even count. Drag to draw a line; it
  must have exactly half of every kind above it. Click two soldiers to swap them (allowed swaps per level).
- Feedback only after the cut: "great cut" (solved within the swaps), "good cut" (solved but with too
  many swaps, level restarts), "too bad".
- Keys: Q, W, E, R show the solution lines per kind and for all; A, S, D show the dual arrangements; +, −
  and the arrow keys zoom and pan the dual view (yellow faces are feasible).
- Solution: dual lines per kind, middle faces of each arrangement (`Util/Algorithms/DCEL/HamSandwich.cs`),
  intersected for all kinds.

## Convex hull

- Tutorial game for developers (see `GameCreation.docx` in the old repository): draw segments between
  points until they form the convex hull. Not linked from the main menu.

## Dots & Polygons (branches, 2020, not merged)

Branch `dots-and-polygons` (May 2020) has the game with the greedy AI; `MultiThreadedalfabeta` (July 2020) builds on it and adds the min-max AI, multithreading and headless tests. Port from the latter.

- Board: up to 20 dots in a 16 × 7 field with minimum spacing and no three collinear (placement via
  Clipper in `DotsPlacer.cs`); "convex" mode puts 20 dots on a jittered circle.
- Move: drag from a dot to another dot. The segment must be new, must not cross another segment
  (shared endpoints allowed) and its midpoint must not lie in a claimed face.
- Closing a face claims it for the mover and gives an extra move; two faces can close at once. Score =
  claimed area. The game ends when all convex-hull edges are drawn (mode 2 additionally requires the
  claimed area to equal the hull area).
- Modes: (1) polygons with holes (enclosed dots become unusable), (2) simple polygons only, (3) convex
  dot positions with the rules of mode 2.
- AIs: greedy (largest closing move, else minimise the opponent's best gain) and min-max with alpha-beta
  (depth 3). The min-max AI replays its predicted line instead of searching each turn, which makes it weak.
- Known bugs: `MinMaxAi.cs` imports `UnityEditor` (player builds fail); `DotsPlacer.cs` uses `second.Y`
  where `right.Y` is meant (near-collinear dots, rare games without an end); rare index errors in the
  trapezoidal map are hidden by a try/catch.

## Assets and credits

- The art of the Unity version (TU/e; backgrounds, castles, soldiers, torch, UI parchment, in `art/` and
  several `Sprites/` folders of the old repository) has no licence file and is not used here; the web
  edition uses Kenney art (see `CLAUDE.md`).
- Font: the old repository uses Eagle Lake (OFL); this repository has its own copy with licence in
  `assets/fonts/`.
- Credits (credits scene `Menu/Scenes/credits.unity`): project lead Kevin Buchin; programming Sander
  Beekhuis, Kevin Buchin, Thom Hurks, Stijn Slot; art Willem Sonke and Thom Castermans; font Eagle Lake.
  Dots & Polygons (branches) by Jolan Rensen and the GitHub user leovsch. `Menu/credits.txt` and
  `ingameText.md` also list music by Kevin MacLeod and Alexandr Zhelanov, but no audio files are in the
  repository and the credits scene does not mention music. The team credits are carried over into
  `CREDITS.md`; the music credits are not, since this edition has no music.

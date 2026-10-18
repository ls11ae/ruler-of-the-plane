# Performance

How fast the heaviest scenes run on a slow machine, and how long a first visit from the QR code takes.
Measured by `e2e/bench.spec.ts` (opt-in), with Chromium's CPU throttling as a stand-in for weak booth
laptops and its "Slow 3G" network profile as a stand-in for a phone at the open house. Decisions are in
the decision log of `docs/design-notes.md` (Phase 6, "Browsers and performance").

## How to measure

```sh
npm run build
BENCH=1 npx playwright test bench --project=laptop --workers=1
```

`BENCH_RATES=1,4,6` (the default) sets the throttling rates. Stop stray Playwright workers first
(`ps aux --sort=-%cpu | head`): every measurement on a busy machine is worthless. Options:
`BENCH_TRACE_DIR=<dir>` keeps the Chromium traces, `BENCH_PROFILE=<file>` saves a CPU profile of the torch
drag, `BENCH_DIST=<dir>` names the build that an already running `vite preview` serves (to compare with an
older version: build it in a `git worktree`, serve it on port 4173, run the benchmark from this tree).

What it measures:

- **Frames.** Each scene is played as a player would, with one pointer move per animation frame for drags
  (browsers deliver mouse moves once per frame) and held keys for the keyboard games. "fps" is what the
  machine shows. "main" is the main thread's work per frame: scripts, style, layout and paint recording,
  without the waits for the rasteriser (from a light trace). Cloud sessions and CI have no GPU, so Chromium
  rasterises in software, which CPU throttling does not slow down and which a laptop's GPU does much
  faster: "fps" there is a worst case, and "main" under 33 ms means room for 30 frames per second on a
  laptop of that speed.
- **The computer's moves.** CPU throttling does not reach Web Workers (a busy loop in a worker took 800,
  813 and 506 ms at 1×, 4× and 6×, on the main thread 519, 1692 and 2365 ms). So "Schwer" is timed
  unthrottled, in the app's own worker on a fixed game (10 castles each on the river valley, the largest
  map, the player at seeded random spots), and the stand-in for a weak laptop is four times that time.
- **First visit.** Time until the start map is complete (its fonts, the parchment and every picture on
  it) on Slow 3G (2 s latency, 50 kB/s each way), the bytes it took, and the size of the service worker's
  precache (its own requests are not throttled, so only their size is reported).

## Results (2026-10-18)

Cloud session: 4 cores (Xeon, 2.1 GHz), no GPU, Chromium 141 headless, laptop window 1280 × 800. "Before"
is `main` at `d6dfe48` (the state before this session), "after" this branch.

| Scene                                             | Rate | Before: fps, main | After: fps, main |
| ------------------------------------------------- | ---- | ----------------- | ---------------- |
| Licht ins Verlies: drag a torch among 17, largest | 1×   | 42, 6 ms          | 60, 5 ms         |
|                                                   | 4×   | 37, 18 ms         | 55, 15 ms        |
|                                                   | 6×   | 36, 24 ms         | 47, 20 ms        |
| Gassi gehen: walk in the woods ("Dickicht")       | 1×   | 60, 4 ms          | 60, 3 ms         |
|                                                   | 4×   | 59, 12 ms         | 60, 11 ms        |
|                                                   | 6×   | 53, 17 ms         | 50, 18 ms        |
| Rasenmähen: two mowers, largest lawn              | 1×   | 60, 2 ms          | 60, 2 ms         |
|                                                   | 4×   | 59, 7 ms          | 59, 6 ms         |
|                                                   | 6×   | 58, 9 ms          | 49, 11 ms        |
| Straßenbau: build roads, 19 villages              | 1×   | 59, 2 ms          | 60, 2 ms         |
|                                                   | 4×   | 60, 6 ms          | 60, 6 ms         |
|                                                   | 6×   | 60, 8 ms          | 60, 8 ms         |
| Erobere das Land: aim, 12 castles (two players)   | 1×   |                   | 57, 4 ms         |
|                                                   | 4×   |                   | 54, 11 ms        |
|                                                   | 6×   |                   | 49, 17 ms        |

Single frames over 33 ms occur in every scene (garbage collection, a newly built road); the slowest in the
final run took 100 ms (one earlier run had a single 367 ms frame in the woods, not seen again in three
repeats). Rows within a few frames per second of each other differ by noise: the lawn is drawn by the
same code before and after, and Chromium drew the park fast enough before it got a layer of its own.

"Schwer" in "Erobere das Land", 10 castles each, river valley, unthrottled worker:

|        | First move (the slowest) | Median move | Stand-in for a weak laptop (4×)  |
| ------ | ------------------------ | ----------- | -------------------------------- |
| Before | 101 ms (cold worker)     | 22 ms       | about 400 ms first, 90 ms median |
| After  | 29–34 ms                 | 6–10 ms     | about 135 ms first, 40 ms median |

The game shows the computer's move after 650 ms in any case (it "thinks" visibly), so below that the
computing time is not noticed; 200 ms is the Phase 2 target. In Node the first move takes 21 ms (43 ms
before), all 135 moves of the fixed test games 1.3 s (3.4 s before).

First visit on Slow 3G (phone; the same for the laptop window):

|        | Start map complete | Bytes until then | Largest files                                       | Precache |
| ------ | ------------------ | ---------------- | --------------------------------------------------- | -------- |
| Before | 27.5 s             | 1145 kB          | parchment 723 kB, Patrick Hand 215 kB, script 96 kB | 2.0 MB   |
| After  | 15.4 s             | 456 kB           | Patrick Hand 215 kB, script 96 kB, Eagle Lake 78 kB | 1.36 MB  |

The script and styles arrive after about 6 s, when the map's ink and parchment appear; the text waits for
the fonts (`font-display: block`, up to 3 s, then a fallback font until they arrive). The fonts are now
two thirds of the bytes: as WOFF2 (the same font data, compressed) they would be 98 instead of 293 kB, the
start map complete after about 11.5 s (proposed, see the decision log). The games load only when opened.

## What was slow, and what changed

- **The ink filter.** An SVG displacement filter on a large element is slow to rasterise, and a board is
  one picture: a moving torch or walker made the browser draw the filtered walls or park again in every
  frame (in a trace of the torch drag, the main thread spent most of its time waiting for the rasteriser).
  `Board` now takes `under`, `over` and `front`: static art in layers of its own, which the browser
  rasterises once. "Licht ins Verlies" (floor under, walls over, torches in front) and "Gassi gehen" (park
  and footpath under) use them. This matters most where SVG filters are drawn on the CPU: Safari on
  phones, Firefox, any browser without a GPU.
- **The game header** measured its layout after every render, which forced a layout in every frame of a
  drag; it now measures when a part changes size.
- **"Schwer"** checks fewer answers (exact pruning), estimates the opponent's answers on a coarser raster,
  and warms up while the player places the first castle.
- **The parchment** was a 723 kB PNG; it is a 35 kB WebP now.

Not changed, after measuring: the lawn, the roads and aiming in "Erobere das Land" stay above 45 frames
per second at 6× without a GPU. Loading the remaining shell screens (credits, staff menu, key test, demo
page) on demand would save about 5 kB gzipped, 0.1 s on Slow 3G. Preloading the fonts made the map
complete 1 s sooner but its first picture 4 s later (the fonts took bandwidth from the script).

## WebKit and Firefox in CI

Both run the smoke tests (laptop and phone) in CI, without a GPU. WebKit draws the park slowest: before
the park had a layer of its own and while its laptop project used Playwright's Retina preset (four times
the pixels), the walks in "Gassi gehen" ran in slow motion (a frame counts at most 50 ms of walking) and
three tests timed out. Real iPhones composite on the GPU and are not comparable; the booth runs Chrome.

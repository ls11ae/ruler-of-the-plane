# Booth package

The offline package for the Windows booth laptops (Phase 7): one folder that runs the whole booth without
internet access, installation or admin rights. The texts for the booth staff are German:
[`LIESMICH.txt`](LIESMICH.txt) in the package, the cheat sheet
[`docs/booth/spickzettel.md`](../docs/booth/spickzettel.md) (also as `Spickzettel.pdf` in the package),
and the checklist for the first test on the laptops,
[`docs/booth/checkliste-laptoptest.md`](../docs/booth/checkliste-laptoptest.md).

## Where it comes from

The workflow [`booth.yml`](../.github/workflows/booth.yml) (Actions → "Booth package" → "Run workflow")
builds the package and uploads it as the artifact `Stand-<version>`, and the cheat sheet and the
checklist as PDFs as the artifact `Druckvorlagen` (no posters or cards: the print material of tsp-boards
covers Ruler of the Plane, Kevin 2026-10-18); for a tag `phase-*` it also
attaches `Stand-<tag>.zip` to the release of that tag (GitHub → Releases), which is where the booth gets
it. Tags mark only booth releases (`phase-6` the laptop test, `phase-7` the feature freeze, `phase-7.1`,
`phase-7.2` … later fixes); Kevin or Maike create them on the Releases page, which starts the workflow. It also runs for pushes that change this folder, `scripts/booth/` or the workflow. Cloud sessions
cannot reach `*.github.io`, so everything that needs the deployed tsp-boards happens there.

```
Stand/
  Start-Stand.cmd             double-click: server, then Chrome in kiosk mode (Firefox, Edge as fallbacks)
  Start-Stand-Firefox.cmd     the same with Firefox
  Stop-Stand.cmd              ends browser and server, restores the power settings
  LIESMICH.txt  VERSION.txt  Spickzettel.pdf  Checkliste-Laptoptest.pdf
  scripts/                    server.ps1, start.ps1, stop.ps1, common.ps1, files.txt
  web/ruler-of-the-plane/     the app, built with VITE_TSP_BOARDS_URL=/tsp-boards/ and VITE_STAFF_PIN
  web/tsp-boards/             tsp-boards' site, downloaded from https://ls11ae.github.io/tsp-boards/
```

The app is served at `http://localhost:8137/ruler-of-the-plane/` (the same path as on GitHub Pages, so
the build is the normal one) and tsp-boards at `/tsp-boards/` on the same origin, as its kiosk frame
needs (see the decision log, Phase 6). The browser profile, and with it the leaderboards, the staff
settings and the app's offline copy, belongs to that origin: keep the port.

## The pieces

- [`scripts/server.ps1`](scripts/server.ps1): a static server on `System.Net.HttpListener`, which Windows
  PowerShell 5.1 has built in. It listens on `http://localhost:<port>/` only (no admin rights needed for
  `localhost`; other hosts and names are refused), answers GET and HEAD, sends the MIME types the
  browsers insist on (`.js`/`.mjs` as `text/javascript` for module workers, `.wasm` as
  `application/wasm`, `.webmanifest`, `.svg`, `.woff2`, …), serves a folder by its `index.html` and never
  as a listing, refuses `..`, hidden files (`.htaccess`), streams and backslashes, and answers
  `If-Modified-Since`. `/__stand/ping` identifies it.
- [`scripts/start.ps1`](scripts/start.ps1) (via `Start-Stand.cmd`): checks the package against
  `scripts/files.txt` (sizes of every file), removes the "downloaded from the internet" mark, starts
  the server hidden, keeps display and system awake while its window is open
  (`SetThreadExecutionState`), sets the power plan's timeouts for display, sleep and hibernation to
  "never" and switches the screen saver off for the session (saving the old values in
  `%LOCALAPPDATA%\RulerOfThePlane\state.json`), warns about a pending Windows Update restart and an
  inactivity lock policy, and opens the browser in kiosk mode on `/ruler-of-the-plane/?kiosk` with its
  own profile (Chrome: no first-run pages, no translation bar, no pinch zoom, no swipe navigation, no
  "restore pages" bubble, no permission prompts, no background traffic; Firefox: the same through a
  `user.js`). It then watches: a browser closed by a visitor (Alt+F4) is opened again (at most 5 times in
  2 minutes), a dead server is restarted. Ctrl+C in its window ends everything. Options:
  `-Browser chrome|firefox|edge`, `-Port`, `-NoBrowser`, `-KeepPowerSettings`.
- [`scripts/stop.ps1`](scripts/stop.ps1) (via `Stop-Stand.cmd`): ends the browsers started with the
  booth profiles (closing their windows first, so they do not offer to restore pages), the server and
  the start window, and restores the saved power settings. Safe to run twice or after the start window
  was closed.
- [`scripts/booth/fetch-tsp-boards.ts`](../scripts/booth/fetch-tsp-boards.ts): tsp-boards has no service
  worker or file list, so its site is crawled from `index.html` through every reference in HTML, CSS,
  JavaScript (module imports, workers and the HiGHS WebAssembly via `new URL(…, import.meta.url)`, data
  files such as `puzzles/index.json`) and JSON (`file` entries: countries and puzzles). A missing file, a
  site without worker or WebAssembly, or a script from another host fails the workflow.
- [`scripts/booth/assemble.ts`](../scripts/booth/assemble.ts): puts the folder together, gives the Windows
  scripts CRLF line ends and the PowerShell scripts a UTF-8 byte order mark (Windows PowerShell 5.1 reads
  them as ANSI otherwise), writes `VERSION.txt` and `files.txt`, and refuses an app build without
  `VITE_TSP_BOARDS_URL=/tsp-boards/`.

## Tests

- `scripts/booth/server.test.ts` (Vitest, part of `npm run test`): the server's contract, whenever `pwsh`
  is installed (CI's Ubuntu runners have it; in a cloud session set `PWSH` to a pwsh you unpacked).
- `scripts/booth/check-package.ts`: the same contract with the package's own `server.ps1`, then every
  file below `web/` as served (status, size, type). The workflow runs it under pwsh and under Windows
  PowerShell 5.1.
- `scripts/booth/package.spec.ts` (`npx playwright test -c scripts/booth/playwright.config.ts`): plays
  the package from its server in Chromium and Firefox with every request to another host blocked: all
  five games, "Rundreise" with a puzzle computed by tsp-boards' worker, the credits; and, in Chromium,
  every game again from the service worker's copy with the network gone.
- `scripts/booth/test-windows.ps1` (workflow, `windows-latest`): `Start-Stand.cmd` with Chrome and with
  Firefox (the server log must show the app's service worker and the precached levels), a browser ended
  by force must come back, `Stop-Stand.cmd` must end everything and restore the power plan.

What CI cannot check (a real laptop's keyboard, mouse and touchpad, sleep and updates over two hours, a
cold start without network) is in the checklist.

## Building it locally

```bash
VITE_TSP_BOARDS_URL=/tsp-boards/ VITE_STAFF_PIN=<pin> npm run build
npx tsx scripts/booth/fetch-tsp-boards.ts --out build/tsp-boards     # needs access to *.github.io
npm run booth:print -- --out build/print                              # Spickzettel.pdf, Checkliste-Laptoptest.pdf
npx tsx scripts/booth/assemble.ts --app dist --tsp build/tsp-boards --out build/Stand \
  --pdf build/print/Spickzettel.pdf --pdf build/print/Checkliste-Laptoptest.pdf
PWSH=pwsh npx playwright test -c scripts/booth/playwright.config.ts
```

`fetch-tsp-boards.ts --url http://localhost:<port>/tsp-boards/` crawls any other copy, e.g. a local
tsp-boards build served by `server.ps1`.

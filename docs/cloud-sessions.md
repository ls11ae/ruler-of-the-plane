# Working with Claude Code on the web

This repository is developed mostly in Claude Code on the web (cloud sessions at claude.ai/code). The
sessions are started by `mbuchin`; `kbuchin` owns the repository and decides open rule questions.
Sessions count against the Claude plan of the account that starts them.

## One-time setup

Repository owner (`kbuchin`):

1. Create `ls11ae/ruler-of-the-plane` (public) and push this repository to it (branch `main`).
2. Add `mbuchin` as a collaborator with the Maintain role (Settings → Collaborators and teams).
3. Settings → Pages → Build and deployment → Source: "GitHub Actions" (the deploy workflow comes in
   Phase 0). Settings → Secrets and variables → Actions → Variables: `VITE_STAFF_PIN` (any four digits)
   and `VITE_TSP_BOARDS_URL` (`https://ls11ae.github.io/tsp-boards/`, set since 2026-10-17).
4. GitHub access for the cloud sessions, one of:
   - install the Claude GitHub App (`github.com/apps/claude`) on the `ls11ae` organization, at least
     for this repository (organization owners install or approve it); or
   - `mbuchin` runs `gh auth login` and then `/web-setup` once in the Claude Code CLI on her computer;
     her cloud sessions then use her GitHub token, and no app installation is needed.

Session runner (`mbuchin`):

1. Accept the collaborator invitation.
2. On claude.ai/code connect GitHub (or use `/web-setup`, see above) and select
   `ls11ae/ruler-of-the-plane`. Start sessions with this repository only: hooks from the repository run
   only in single-repository sessions.
3. Environment: the default network access ("Trusted": package registries and GitHub) is enough. Nothing
   else to configure; `.claude/settings.json` runs `scripts/cloud-session-start.sh`, which installs the
   npm dependencies at session start.

## Running sessions

- One session per phase, from Phase 2 on one per track. Suggested first messages:
  - Phase 0: "Read CLAUDE.md, then work on Phase 0 of docs/roadmap.md."
  - Phase 1: "Read CLAUDE.md, then work on Phase 1 of docs/roadmap.md."
  - From Phase 2 on, two sessions in parallel: "Read CLAUDE.md, then work on track A (Phase 2, then
    Phase 4) of docs/roadmap.md." and the same for track B (Phase 3, then Phase 5).
- The session pushes its branch after each finished roadmap item and ends with a report: pull request
  title and description, "proposed" decisions, changes to shared code, open points. Use "Create PR"
  with that text, wait for green CI, look at the Playwright screenshots (workflow artifacts), and merge
  into `main`. `main` deploys to `ls11ae.github.io/ruler-of-the-plane/`; check the site after the merge
  (cloud sessions cannot open `*.github.io`).
- If the session could not push files under `.github/workflows/` (missing workflow rights), it leaves
  them in `docs/ci/`; add them through GitHub's web interface (Add file → Create new file, path
  `.github/workflows/<name>.yml`).
- Rule questions that change how a game plays go to Kevin; Claude marks them "proposed" in the decision
  log (`docs/design-notes.md`) and in the report.
- After the last pull request of a phase, tag `main` as `phase-<n>` (GitHub → Releases → Draft a new
  release). That tag is the booth's fallback. For a `phase-*` tag the workflow "Booth package" attaches
  the offline package `Stand-phase-<n>.zip` to that release (after testing it on Windows); it also runs
  by hand (Actions → Booth package → Run workflow) and uploads the package and the print files as
  artifacts (`booth/README.md`).
- Texts for proofreading: `docs/texts-de.md`, and the artifact `texte-screenshots` of the workflow
  "Texts" (every screen at 1280 × 800).

## Limits of the cloud environment

- Node 22 is on the PATH; the project needs Node ≥ 22.13 (`.nvmrc`, `engines` in `package.json`).
- Only package registries and GitHub are reachable by default. All art and fonts are therefore in
  `assets/`. If a session ever needs another site, add the files to the repository, or set the
  environment's network access to "Custom" and list the domain (keep "include default list" ticked).
- The cloud image has an older Chromium at `/opt/pw-browsers/chromium`, which `playwright.config.ts`
  uses outside CI; sessions can therefore run the Playwright tests and look at the screenshots. CI runs
  them with the matching browser and uploads the screenshots. Firefox and WebKit cannot be downloaded in
  a session (Playwright's CDN is not reachable), so their projects are left out there and run in CI only
  (artifacts `screenshots-firefox`, `screenshots-webkit`); iterate on them through CI.
- Stop stray Playwright workers before measuring anything (`ps aux --sort=-%cpu | head`): a test that
  loops forever keeps its worker busy after the run is killed, and the numbers of every later
  measurement are then wrong.

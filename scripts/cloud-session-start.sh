#!/usr/bin/env bash
# Session start hook (see .claude/settings.json).
# In Claude Code on the web (cloud sessions) it installs the npm dependencies, so that
# `npm run check` works right away. Locally it does nothing.
# It never fails the session: problems are reported and the session continues.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0

if [ ! -f package.json ]; then
  echo "cloud-session-start: no package.json yet (Phase 0 creates it), nothing to install."
  exit 0
fi

# Resumed session with dependencies already installed from the current lockfile: nothing to do.
if [ -f package-lock.json ] && [ -f node_modules/.package-lock.json ] \
  && [ ! package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "cloud-session-start: dependencies up to date."
  exit 0
fi

log=/tmp/cloud-session-npm.log
if [ -f package-lock.json ] && npm ci --no-audit --no-fund >"$log" 2>&1; then
  echo "cloud-session-start: dependencies installed (npm ci)."
elif npm install --no-audit --no-fund >>"$log" 2>&1; then
  echo "cloud-session-start: dependencies installed (npm install)."
else
  echo "cloud-session-start: installing dependencies failed, see $log; fix this before 'npm run check'."
fi
exit 0

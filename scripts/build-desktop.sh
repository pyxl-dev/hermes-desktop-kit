#!/usr/bin/env bash
# Rebuild + repackage Hermes Desktop from a source checkout, in place.
#
#   ./scripts/build-desktop.sh [path-to-hermes-checkout]
#
# Produces apps/desktop/release/mac-arm64/Hermes.app (electron-builder `--dir`).
# Quit and reopen Hermes afterwards — a running app keeps the bundle it booted.
set -euo pipefail

repo="${1:-$HOME/.hermes/hermes-agent}"

if [ ! -d "$repo/apps/desktop" ]; then
  echo "no apps/desktop under $repo" >&2
  echo "usage: $0 [path-to-hermes-checkout]" >&2
  exit 1
fi

cd "$repo/apps/desktop"

echo "== build ($(node --version))"
npm run build

echo "== package"
npm run pack

app="$repo/apps/desktop/release/mac-arm64/Hermes.app"
if [ -d "$app" ]; then
  echo
  echo "packaged: $app"
  echo "quit and reopen Hermes to run the new build."
else
  echo "build finished but $app is missing — check electron-builder output above" >&2
  exit 1
fi

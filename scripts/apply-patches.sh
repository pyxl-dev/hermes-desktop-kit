#!/usr/bin/env bash
# Apply this repo's core patches to a Hermes checkout. Idempotent: a patch that
# is already applied is skipped, so this is the command to re-run after every
# `hermes update`.
#
#   ./scripts/apply-patches.sh [path-to-hermes-checkout]
#
# Default checkout: $HOME/.hermes/hermes-agent
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo="${1:-$HOME/.hermes/hermes-agent}"

if [ ! -d "$repo/.git" ]; then
  echo "not a git checkout: $repo" >&2
  echo "usage: $0 [path-to-hermes-checkout]" >&2
  exit 1
fi

cd "$repo"

shopt -s nullglob
patches=("$root"/patches/*.patch)
shopt -u nullglob

if [ "${#patches[@]}" -eq 0 ]; then
  echo "no patches found under $root/patches" >&2
  exit 1
fi

applied=0
skipped=0

for patch in "${patches[@]}"; do
  name="$(basename "$patch")"

  if git apply --reverse --check "$patch" >/dev/null 2>&1; then
    echo "already applied: $name"
    skipped=$((skipped + 1))
    continue
  fi

  if ! git apply --check "$patch" >/dev/null 2>&1; then
    echo "does not apply cleanly: $name" >&2
    echo "  the checkout has moved under it — inspect with:" >&2
    echo "  cd \"$repo\" && git apply --check -v \"$patch\"" >&2
    exit 1
  fi

  git apply "$patch"
  echo "applied: $name"
  applied=$((applied + 1))
done

echo
echo "applied $applied, already present $skipped"
if [ "$applied" -gt 0 ]; then
  echo "Rebuild the app to see it: ./scripts/build-desktop.sh \"$repo\""
fi

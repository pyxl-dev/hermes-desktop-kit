#!/usr/bin/env bash
# Reconcile the kit with the live Hermes install, silently when there is
# nothing to do (cron contract: empty stdout = no notification).
#
# A `hermes update` rewrites the core checkout, which drops patches/*.patch; the
# runtime plugins live in $HERMES_HOME/desktop-plugins/ and survive, but their
# copies can drift from the kit. This script closes both gaps and reports only
# what it had to touch.
#
#   ./scripts/reconcile.sh [path-to-hermes-checkout]
#
# Exit code is always 0 when the kit is present: a failed patch is reported as
# text (so the notification fires) instead of a cron error.
set -uo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo="${1:-${HERMES_HOME:-$HOME/.hermes}/hermes-agent}"
plugins="${HERMES_HOME:-$HOME/.hermes}/desktop-plugins"

[ -n "$(git -C "$repo" rev-parse --git-dir 2>/dev/null)" ] || exit 0

notes=()

# 1. Core patches — reapply what the last update reverted.
if [ -f "$root/scripts/apply-patches.sh" ]; then
  out="$(bash "$root/scripts/apply-patches.sh" "$repo" 2>&1)"
  rc=$?

  if [ "$rc" -ne 0 ]; then
    printf 'Hermes Desktop kit: patch non applicable sur %s\n%s\n' "$repo" "$out"
    exit 0
  fi

  if printf '%s\n' "$out" | grep -q '^applied [1-9]'; then
    notes+=("Patch des onglets dans la barre d'onglets réappliqué (une mise à jour Hermes avait réécrit le core). Rebuild puis relance nécessaires pour le voir.")
  fi
fi

# 2. Runtime plugins — a stale copy in desktop-plugins/ looks exactly like a bug.
for dir in "$root"/plugins/*/; do
  [ -d "$dir" ] || continue
  name="$(basename "$dir")"
  src="$dir/plugin.js"
  dst="$plugins/$name/plugin.js"

  [ -f "$src" ] || continue
  if ! cmp -s "$src" "$dst"; then
    mkdir -p "$(dirname "$dst")" && cp "$src" "$dst"
    notes+=("Plugin $name réinstallé depuis le kit (la copie locale avait divergé). Rescan des plugins pour l'appliquer.")
  fi
done

[ "${#notes[@]}" -eq 0 ] && exit 0

printf 'Hermes Desktop kit:\n'
for note in "${notes[@]}"; do
  printf -- '- %s\n' "$note"
done

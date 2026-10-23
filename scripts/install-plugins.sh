#!/usr/bin/env bash
# Install every runtime desktop plugin in this repo into $HERMES_HOME/desktop-plugins.
# Re-runs are safe: each plugin folder is replaced with the copy from this repo.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
hermes_home="${HERMES_HOME:-$HOME/.hermes}"
target="$hermes_home/desktop-plugins"

mkdir -p "$target"

found=0
for dir in "$root"/plugins/*/; do
  [ -f "${dir}plugin.js" ] || continue
  name="$(basename "$dir")"
  mkdir -p "$target/$name"
  cp "${dir}plugin.js" "$target/$name/plugin.js"
  found=$((found + 1))
  echo "installed $name -> $target/$name/plugin.js"
done

if [ "$found" -eq 0 ]; then
  echo "no plugins found under $root/plugins" >&2
  exit 1
fi

echo
echo "Hermes rescans $target within a few seconds."
echo "To load them now: ⌘K → \"Reload desktop plugins\" (or restart Hermes)."

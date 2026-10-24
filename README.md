# Hermes Desktop Kit

Small, opinionated improvements for [Hermes Desktop](https://hermes-agent.nousresearch.com/docs) that are not in core (yet): runtime desktop plugins, plus a couple of narrowly scoped source patches for the parts of the UI that have no plugin seam.

Everything here is meant to be read, re-applied after a Hermes update, and thrown away the day the feature lands upstream.

## What's inside

| Improvement | Kind | Where |
| --- | --- | --- |
| **Composer profile pill** — pick the profile in the composer, right beside the model pill. Locks itself as soon as a conversation has started. | Runtime desktop plugin (no rebuild) | [`plugins/composer-profile-pill`](plugins/composer-profile-pill) |
| **Profile mark in session tabs** — the owning profile's glyph shows to the left of the tab name. | Core patch (rebuild) | [`patches/0001-tab-profile-glyph.patch`](patches/0001-tab-profile-glyph.patch) |

## Install

Requirements: macOS/Linux, a Hermes Desktop install, and — for the patches — the `hermes-agent` source checkout plus Node 22+.

### 1. Plugins (live, no rebuild)

```bash
./scripts/install-plugins.sh
```

Copies every `plugins/<name>/plugin.js` into `$HERMES_HOME/desktop-plugins/<name>/` (default `~/.hermes/desktop-plugins`). The app rescans that folder on its own within a few seconds; to force it, run **⌘K → “Reload desktop plugins”**. Plugins can be turned off in **Settings → Plugins** without deleting them.

### 2. Core patches (rebuild)

```bash
./scripts/apply-patches.sh ~/.hermes/hermes-agent   # idempotent; re-run after every hermes update
./scripts/build-desktop.sh ~/.hermes/hermes-agent   # npm run build && npm run pack
```

`apply-patches.sh` skips a patch that is already applied, so it is safe to re-run. The build writes the packaged app to `apps/desktop/release/mac-arm64/Hermes.app`; quit and reopen Hermes to see the change.

### 3. Forget about it (optional)

A `hermes update` rewrites the core checkout, so the patches have to come back afterwards. `scripts/reconcile.sh` closes that gap and is silent when there is nothing to do:

```bash
./scripts/reconcile.sh                  # re-apply missing patches, repair stale plugin copies
```

Wire it to the Hermes scheduler and the maintenance stops depending on anyone remembering:

```bash
cp scripts/reconcile.sh ~/.hermes/scripts/kit-reconcile.sh   # or a shim that execs this repo's copy
hermes cron create "17 * * * *" --name "Hermes Desktop kit — reconcile" \
  --script kit-reconcile.sh --no-agent --deliver telegram
```

`--no-agent` runs the script with no LLM; empty stdout means no message is sent, so a routine run costs nothing and says nothing. It speaks up only when it had to reapply a patch (then a rebuild and a relaunch are needed to see it) or when it repaired a plugin copy (then a plugin rescan applies it).

## Layout

```
plugins/<name>/plugin.js      runtime desktop plugins (drop-in, plain ESM)
patches/*.patch               core source patches, applied with git apply
scripts/install-plugins.sh    install the plugins into $HERMES_HOME
scripts/apply-patches.sh      apply / verify the core patches
scripts/reconcile.sh          re-apply missing patches + repair stale plugin copies (cron-friendly, silent on no-op)
scripts/build-desktop.sh      rebuild + repackage Hermes Desktop
docs/                         one page per improvement, with the reasoning
```

## Staying honest

- A patch is not a fork. It applies against the checkout you run, and `git apply --check` tells you before it touches anything. After a Hermes update re-run `apply-patches.sh`; if a patch no longer applies cleanly, that line of core changed and the patch needs a look.
- Runtime plugins load with full app authority. Read `plugin.js` before installing it — that is the whole point of keeping them small and plain JavaScript.
- Nothing here phones home or ships credentials. Profile names, colors and drafts stay on the machine.

## License

MIT — see [LICENSE](LICENSE).

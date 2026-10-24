# Profile mark in session tabs

Each session tab shows the owning profile's glyph to the left of its name — the same mark the sidebar row and the profile rail paint.

## Why this is a patch and not a plugin

The composer has a plugin seam (`composer.actions`). The tab strip does not: a tab's leading cell is `tabLead`, handed to the tree renderer by the pane that registers it, and re-registering that pane from a plugin would mean replacing the whole chat surface. The smallest honest change is at the source of the two `tabLead` factories.

## What changes

| File | Change |
| --- | --- |
| `apps/desktop/src/app/chat/tab-profile-mark.tsx` | new — `TabProfileMark`, renders the profile chip, nothing for `default` |
| `apps/desktop/src/app/chat/tab-profile-mark.test.tsx` | new — default renders nothing, a named profile renders its initial |
| `apps/desktop/src/app/contrib/controller.tsx` | main workspace tab: profile mark before the status dot |
| `apps/desktop/src/app/chat/session-tile.tsx` | session tiles: same, per tile |

The default profile deliberately gets no glyph. It is the app's own workspace; marking every tab with it would clutter single-profile installs and say nothing. A named profile is real routing information and the sidebar already shows it, so a tab that names only the session would otherwise read as belonging to whatever profile the window happens to be on.

The mark is informational and immutable: it comes from the session row's `profile` field, which is fixed at session creation — the tab can never disagree with the conversation it points at.

## Apply

```bash
./scripts/apply-patches.sh ~/.hermes/hermes-agent
./scripts/build-desktop.sh ~/.hermes/hermes-agent
```

Then quit and reopen Hermes.

Re-run `apply-patches.sh` after every `hermes update`: the script skips a patch that is already applied and refuses (with a `git apply --check` verdict) when upstream moved the lines it touches.

## Revert

```bash
cd ~/.hermes/hermes-agent
git apply --reverse patches/0001-tab-profile-glyph.patch   # from this repo
```

or `git checkout -- apps/desktop/src/app/contrib/controller.tsx apps/desktop/src/app/chat/session-tile.tsx` and delete the two new files. Rebuild afterwards.

## Upstream

This one is proposed to Nous Research instead of living here forever: **PR [NousResearch/hermes-agent#143813](https://github.com/NousResearch/hermes-agent/pull/143813)**, serving the open issue [#102497](https://github.com/NousResearch/hermes-agent/issues/102497) (it asks for the same tab-lead surface, for bot faces).

CI on that PR sits at `action_required` until a maintainer approves the workflow run for a first-time contributor — nothing has run yet, so do not read it as green. If the PR lands, delete `patches/0001-tab-profile-glyph.patch`, drop the core patch from this kit, and the tab mark comes with the app. The composer pill stays a plugin either way.

## Sizing

The sidebar chip is 16px; a tab is 11px text, so the mark is 14px (`size-3.5`) with a 2px radius and a 1px gap before the label. It sits in `tabLead`, which means it also inherits the ⌘-number overlay: holding ⌘ still swaps the lead for the tab's shortcut number.

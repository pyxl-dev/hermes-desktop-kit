# Composer profile pill

A profile picker in the composer, immediately before the model pill. It answers one question fast — *which profile is this chat on?* — and lets you move to another one **before** a conversation exists.

![pill](https://img.shields.io/badge/kind-runtime%20plugin-blue)

## What it does

- Shows the active profile: the `home` mark for the default profile, a tinted initial for every named one (same shapes and the same colours as the profile rail — it reads the rail's own `hermes.desktop.profileColors` overrides and reproduces the deterministic hue).
- Opens a roster of every profile on the current gateway source, with the model each one is on, a filter once there are more than six, and a shortcut to *Manage profiles…*.
- Picking a profile does exactly what clicking it in the rail does: the workspace moves to that profile's gateway and a fresh chat opens there.

## It locks once the conversation has started

A Hermes session belongs to exactly one profile. There is no "switch this conversation's profile" — it would silently move the transcript, the tools, the memory and the routing of a chat that already exists.

So the pill is a control only while the composer holds a draft with no session behind it:

| Composer state | Pill |
| --- | --- |
| New chat, no session yet (even with text typed) | clickable, chevron, opens the roster |
| Any started or restored conversation | same pill, `lock` icon, no menu, hover explains |

Text typed in a draft is carried over to the new draft when you switch, so choosing a profile never eats the sentence you were writing.

## Install

```bash
./scripts/install-plugins.sh            # from the repo root
```

or copy by hand:

```bash
mkdir -p ~/.hermes/desktop-plugins/composer-profile-pill
cp plugin.js ~/.hermes/desktop-plugins/composer-profile-pill/
```

Hermes rescans `~/.hermes/desktop-plugins` on its own; force it with **⌘K → “Reload desktop plugins”**.

## Settings

**Settings → Plugins → Composer profile pill** has one switch, *Show the profile name*. Off keeps the mark alone (the narrowest form of the pill). The preference is stored per plugin (`ctx.storage`), so it survives reloads.

## Notes

- No rebuild, no core patch: the plugin registers into the `composer.actions` area, the same seam core uses for composer chips.
- Only `@hermes/plugin-sdk` and `react*` are importable from a runtime plugin; this file imports nothing else.
- If the roster ever reads *Profile list unavailable*, the gateway REST call failed — the picker degrades, it does not throw into the composer.

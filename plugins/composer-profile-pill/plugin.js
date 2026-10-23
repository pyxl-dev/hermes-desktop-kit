/**
 * Composer profile pill — pick the Hermes profile from the composer, right next
 * to the model pill, instead of hunting for the profile rail.
 *
 * Runtime desktop plugin: drop this folder in `$HERMES_HOME/desktop-plugins/`
 * and the app loads it at runtime (no rebuild). Plain ESM + `jsx()` calls, the
 * import allowlist is `@hermes/plugin-sdk` / `react*` only.
 *
 * Behaviour: picking a profile is the same thing the profile rail does — the
 * workspace moves to that profile's gateway and a fresh chat opens. It never
 * edits the current session in place: a Hermes session belongs to exactly one
 * profile.
 */

import {
  atom,
  Button,
  Codicon,
  host,
  icons,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RowButton,
  SearchField,
  ToggleRow,
  usePluginI18n,
  useValue
} from '@hermes/plugin-sdk'
import { useEffect, useMemo, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

const ID = 'composer-profile-pill'

/** Core persists the rail's per-profile color overrides here; read it so the
 *  pill's mark matches the rail square for the same profile. */
const PROFILE_COLORS_KEY = 'hermes.desktop.profileColors'

const DEFAULTS = { showLabel: true }

// ── profile identity (same rules as core ProfileGlyph / profile-color) ──────

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

function normalizeProfileKey(name) {
  const key = (name ?? '').trim()

  return key || 'default'
}

function shortLabel(label) {
  for (const { segment } of graphemes.segment(label.trim())) {
    if (/[\p{L}\p{N}\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(segment)) {
      return segment
    }
  }

  return '?'
}

function hashString(value) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function deterministicColor(name) {
  const key = (name ?? '').trim()

  if (!key || key === 'default') {
    return null
  }

  return `hsl(${hashString(key) % 360} 68% 58%)`
}

function readProfileColors() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROFILE_COLORS_KEY) || '{}')

    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function resolveColor(name, overrides) {
  const key = (name ?? '').trim()

  if (!key || key === 'default') {
    return null
  }

  return overrides[key] || deterministicColor(key)
}

function soft(color, percent) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`
}

function profileLabel(profile) {
  const name = normalizeProfileKey(profile && profile.name)

  return (profile && (profile.display_name || profile.bot_title)) || name
}

/** A profile's mark: `home` for the default profile, a tinted initial
 *  otherwise — the same two shapes the profile rail paints. */
function ProfileMark({ colors, name }) {
  const key = normalizeProfileKey(name)

  if (key === 'default') {
    return jsx('span', {
      className: 'hdp-mark hdp-mark-home',
      children: jsx(Codicon, { name: 'home', size: '0.75rem' })
    })
  }

  const color = resolveColor(key, colors)

  return jsx('span', {
    className: 'hdp-mark',
    style: { backgroundColor: soft(color, 22), color },
    children: shortLabel(key)
  })
}

// ── the pill ───────────────────────────────────────────────────────────────

function ProfilePill({ prefs, schedule }) {
  const t = usePluginI18n(ID)
  const active = normalizeProfileKey(useValue(host.state.profile))
  const { showLabel } = useValue(prefs)
  // A profile is bound to the session it opened. Once this conversation has
  // started — a durable session row, or a live runtime — the profile is no
  // longer a composer-level choice: the pill keeps naming it and stops being a
  // control. A draft (no id yet, even with text typed) is still free to switch.
  const runtimeId = useValue(host.state.activeSessionId)
  const storedId = useValue(host.state.focusedStoredSessionId)
  const locked = runtimeId !== null || storedId !== null
  const [open, setOpen] = useState(false)
  const [profiles, setProfiles] = useState([])
  const [query, setQuery] = useState('')
  const [colors, setColors] = useState(readProfileColors)
  const [failed, setFailed] = useState(false)

  // The roster is REST-backed and cached by core; reload on open (a profile
  // can be created or deleted from another surface at any time) and whenever
  // the active profile changes, so the pill and the list never disagree.
  useEffect(() => {
    let live = true

    host.profiles
      .list()
      .then(list => {
        if (live) {
          setProfiles(Array.isArray(list) ? list : [])
          setFailed(false)
        }
      })
      .catch(() => {
        if (live) {
          setFailed(true)
        }
      })

    return () => {
      live = false
    }
  }, [open, active])

  const ordered = useMemo(() => {
    const rank = profile => (profile.is_default ? 0 : 1)
    const sorted = [...profiles].sort(
      (left, right) => rank(left) - rank(right) || profileLabel(left).localeCompare(profileLabel(right))
    )
    const needle = query.trim().toLowerCase()

    return needle
      ? sorted.filter(profile => `${profile.name} ${profileLabel(profile)}`.toLowerCase().includes(needle))
      : sorted
  }, [profiles, query])

  const activeProfile = profiles.find(profile => normalizeProfileKey(profile.name) === active)
  const activeLabel = activeProfile ? profileLabel(activeProfile) : active

  const choose = async name => {
    const target = normalizeProfileKey(name)

    setOpen(false)
    setQuery('')

    if (locked || target === active) {
      return
    }

    // Typed text is not a conversation yet: carry it into the new draft rather
    // than dropping it on the floor. The composer answers the write once the
    // new surface mounts, so retry a few frames against that swap.
    let carried = ''

    try {
      carried = (await host.composer.getDraft()) || ''
    } catch {
      carried = ''
    }

    // Same contract as the profile rail: move the workspace to that profile's
    // gateway and open a fresh chat there. The outgoing session keeps its row.
    host.newChat(target)

    if (carried.trim()) {
      const write = (attempt = 0) => {
        host.composer.setDraft(null, carried).then(ok => {
          if (!ok && attempt < 10) {
            schedule(() => write(attempt + 1), 120)
          }
        })
      }

      write()
    }
  }

  // Locked: the profile is a fact about this conversation, not a choice. Same
  // pill, no caret, no menu — hovering says why.
  if (locked) {
    return jsx(Button, {
      'aria-label': t('locked', activeLabel),
      className: 'hdp-pill hdp-pill-locked',
      'data-locked': true,
      size: 'micro',
      title: t('lockedHint'),
      variant: 'ghost',
      children: jsxs('span', {
        className: 'hdp-pill-inner',
        children: [
          jsx(ProfileMark, { colors, name: active }),
          showLabel ? jsx('span', { className: 'hdp-pill-label', children: activeLabel }) : null,
          jsx('span', { className: 'hdp-pill-lock', children: jsx(Codicon, { name: 'lock', size: '0.625rem' }) })
        ]
      })
    })
  }

  const trigger = jsxs(Button, {
    'aria-label': t('switchTo', activeLabel),
    className: 'hdp-pill',
    size: 'micro',
    title: t('switchTo', activeLabel),
    variant: 'ghost',
    children: [
      jsx(ProfileMark, { colors, name: active }),
      showLabel ? jsx('span', { className: 'hdp-pill-label', children: activeLabel }) : null,
      jsx('span', { className: 'hdp-pill-caret', children: jsx(Codicon, { name: 'chevron-down', size: '0.625rem' }) })
    ]
  })

  return jsxs(Popover, {
    onOpenChange: next => {
      setOpen(next)

      if (next) {
        setColors(readProfileColors())
      }
    },
    open,
    children: [
      jsx(PopoverTrigger, { asChild: true, children: trigger }),
      jsx(PopoverContent, {
        align: 'end',
        'aria-label': t('title'),
        className: 'hdp-panel',
        side: 'top',
        sideOffset: 6,
        children: jsxs('div', {
          children: [
            jsx('div', { className: 'hdp-head', children: t('title') }),
            profiles.length > 6
              ? jsx('div', {
                  className: 'hdp-search',
                  children: jsx(SearchField, {
                    'aria-label': t('search'),
                    onChange: setQuery,
                    placeholder: t('search'),
                    value: query
                  })
                })
              : null,
            jsx('div', {
              className: 'hdp-list',
              role: 'listbox',
              children:
                ordered.length === 0
                  ? jsx('div', {
                      className: 'hdp-empty',
                      children: failed ? t('loadFailed') : t('noMatch')
                    })
                  : ordered.map(profile =>
                      jsxs(
                        RowButton,
                        {
                          'aria-selected': normalizeProfileKey(profile.name) === active,
                          className: 'hdp-row',
                          'data-current': normalizeProfileKey(profile.name) === active || undefined,
                          onClick: () => choose(profile.name),
                          onPointerEnter: () => host.warmProfile(profile.name),
                          role: 'option',
                          children: [
                            jsx(ProfileMark, { colors, name: profile.name }),
                            jsxs('span', {
                              className: 'hdp-row-text',
                              children: [
                                jsx('span', { className: 'hdp-row-name', children: profileLabel(profile) }),
                                profile.model
                                  ? jsx('span', { className: 'hdp-row-meta', children: profile.model })
                                  : null
                              ]
                            }),
                            normalizeProfileKey(profile.name) === active
                              ? jsx('span', {
                                  className: 'hdp-row-check',
                                  children: jsx(icons.Check, { size: 12 })
                                })
                              : null
                          ]
                        },
                        profile.name
                      )
                    )
            }),
            jsx('div', {
              className: 'hdp-foot',
              children: jsx(RowButton, {
                className: 'hdp-row hdp-manage',
                onClick: () => {
                  setOpen(false)
                  host.navigate('#/profiles')
                },
                children: jsxs('span', {
                  className: 'hdp-manage-text',
                  children: [
                    jsx(Codicon, { name: 'settings-gear', size: '0.75rem' }),
                    jsx('span', { children: t('manage') })
                  ]
                })
              })
            })
          ]
        })
      })
    ]
  })
}

// Disk plugins are never scanned by Tailwind: only layout lives here; the
// Button / Popover / SearchField own their own chrome and theme tokens.
const CSS = `
.hdp-pill{display:flex;align-items:center;gap:4px;min-width:0;max-width:11rem;height:var(--composer-control-size,24px);padding:0 6px;border-radius:6px;font-size:12px;font-weight:400;color:var(--ui-text-tertiary)}
.hdp-pill:hover{background:var(--chrome-action-hover);color:var(--ui-text-primary)}
.hdp-pill-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hdp-pill-caret{display:flex;flex-shrink:0;align-items:center;opacity:.7}
.hdp-pill-inner{display:flex;align-items:center;gap:4px;min-width:0}
.hdp-pill-locked{cursor:default}
.hdp-pill-locked:hover{background:transparent;color:var(--ui-text-tertiary)}
.hdp-pill-lock{display:flex;flex-shrink:0;align-items:center;opacity:.45}
.hdp-mark{display:grid;place-items:center;flex-shrink:0;width:1rem;height:1rem;border-radius:3px;font-size:.5rem;font-weight:600;line-height:1;text-transform:uppercase}
.hdp-mark-home{color:var(--ui-text-quaternary)}
.hdp-panel{width:16.5rem;max-width:calc(100vw - 24px)}
.hdp-head{padding:2px 6px 6px;font-size:.625rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ui-text-quaternary)}
.hdp-search{display:flex;align-items:center;padding:0 2px 4px}
.hdp-search>div{flex:1;min-width:0}
.hdp-list{max-height:19rem;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
.hdp-row{display:flex;align-items:center;gap:8px;width:100%;padding:4px 6px;border:0;border-radius:5px;background:transparent;color:var(--ui-text-secondary);text-align:left;cursor:pointer}
.hdp-row:hover{background:var(--chrome-action-hover)}
.hdp-row[data-current]{color:var(--ui-text-primary)}
.hdp-row-text{display:flex;min-width:0;flex:1;flex-direction:column;gap:1px}
.hdp-row-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:500}
.hdp-row-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.625rem;color:var(--ui-text-quaternary)}
.hdp-row-check{display:flex;flex-shrink:0;align-items:center;color:var(--ui-accent)}
.hdp-empty{padding:10px 6px;font-size:11px;color:var(--ui-text-tertiary)}
.hdp-foot{margin-top:4px;padding-top:4px;border-top:1px solid var(--ui-stroke-tertiary)}
.hdp-manage{font-size:11px}
.hdp-manage-text{display:flex;align-items:center;gap:6px}
`

export default {
  id: ID,
  name: 'Composer profile pill',
  description: 'Profile picker in the composer, beside the model pill.',
  register(ctx) {
    ctx.i18n.register({
      en: {
        switchTo: 'Switch profile (current: {0})',
        locked: 'Profile: {0}',
        lockedHint: 'This conversation belongs to that profile — start a new chat to pick another one.',
        title: 'Profile',
        search: 'Find a profile…',
        manage: 'Manage profiles…',
        noMatch: 'No profile matches.',
        loadFailed: 'Profile list unavailable.',
        showLabel: 'Show the profile name',
        showLabelHint: 'Off: the pill keeps the profile mark only, like the model pill at its narrowest.'
      },
      fr: {
        switchTo: 'Changer de profil (actuel : {0})',
        locked: 'Profil : {0}',
        lockedHint: 'Cette conversation appartient à ce profil. Ouvrez un nouveau chat pour en choisir un autre.',
        title: 'Profil',
        search: 'Chercher un profil…',
        manage: 'Gérer les profils…',
        noMatch: 'Aucun profil ne correspond.',
        loadFailed: 'Liste des profils indisponible.',
        showLabel: 'Afficher le nom du profil',
        showLabelHint: 'Désactivé : la pastille ne garde que la marque du profil.'
      }
    })

    const style = document.createElement('style')
    style.textContent = CSS
    document.head.append(style)
    ctx.onDispose(() => style.remove())

    const prefs = atom({ ...DEFAULTS, ...ctx.storage.get('prefs', {}) })

    const update = patch => {
      prefs.set({ ...prefs.get(), ...patch })
      ctx.storage.set('prefs', prefs.get())
    }

    ctx.register({
      id: 'pill',
      // `composer.actions` renders inline in the composer's control row,
      // immediately before the model pill.
      area: 'composer.actions',
      order: 10,
      render: () => jsx(ProfilePill, { prefs, schedule: (fn, ms) => ctx.setTimeout(fn, ms) })
    })

    ctx.registerSettingsPage?.({
      id: 'settings',
      title: 'Composer profile pill',
      icon: 'account',
      render: function General() {
        const { showLabel } = useValue(prefs)

        return jsx(ToggleRow, {
          checked: showLabel,
          description: ctx.i18n.t('showLabelHint'),
          label: ctx.i18n.t('showLabel'),
          onChange: on => update({ showLabel: on })
        })
      }
    })
  }
}

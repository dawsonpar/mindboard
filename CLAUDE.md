# MindBoard - Agent Notes

Project-level guidance for agents working in this repo. Keep it short.

## The UI is themeable at runtime - never hardcode colors

MindBoard's colors are user-configurable. `mindboard.config.json` holds a
`theme` object that `ThemeProvider` applies at runtime by overriding CSS
variables on `:root`. The baked-in default in `globals.css` (`@theme`) is a
DARK palette; the user's current config overrides it to a LIGHT one. A user
can set light, dark, or a fully custom palette at any time.

There are two distinct classes of color token. Treat them differently:

- SURFACE tokens - `obsidian-bg`, `obsidian-panel`, `obsidian-card`,
  `obsidian-text`, `obsidian-muted`, `obsidian-border`, `obsidian-accent`.
  These are user-controlled and swap at runtime. You cannot assume any of
  them is light or dark.
- SEMANTIC colors - `priority-p0..p3`. These are FIXED constants in
  `globals.css` that the theme never overrides. That is why priority pills
  stay legible in every theme.

### Rule for any new/changed UI

Derive colors from a guaranteed-contrast token PAIR; never assume a single
token's lightness. The reliable legibility contract a theme must uphold is
`text` readable on `bg` / `card` / `panel`. So:

- For a filled element that must stay readable in any theme, use
  `fill = obsidian-text` + `content = obsidian-bg`. It inverts gracefully
  (dark element/light content in a light theme; the reverse in a dark theme).
- Or mirror the priority pattern: a FIXED semantic fill color +
  `text-obsidian-bg` content.

### Pitfall we already hit (the complexity badge)

`fill = obsidian-border` + `content = obsidian-bg` looked fine in the light
theme but rendered dark-on-dark (effectively invisible) under a dark theme,
because `border` is a fixed dark gray and `bg` flips dark. The complexity
badge in `KanbanCard.tsx` now uses `bg-obsidian-text text-obsidian-bg` for
this reason.

### Before shipping any UI change

Sanity-check it against BOTH a light and a dark theme. You can override the
`--color-obsidian-*` variables in the browser (or temporarily in
`mindboard.config.json`) to preview a dark palette without committing it.

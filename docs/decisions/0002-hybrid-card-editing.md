# Hybrid card editing

Date: 2026-06-27
Status: Accepted

## Context

The card page should read like an article (rendered markdown), but every field
must stay editable in place. Rendered markdown and a raw editor cannot occupy the
same element at once, so an editing affordance is needed for prose.

## Decision

A hybrid model:

- Structured fields (status, priority, complexity, task checkboxes, references)
  are always live: one interaction changes them, with no edit mode.
- The title and the markdown bodies (description, notes) render by default and
  become a raw-markdown editor on click, re-rendering and saving on blur.

## Consequences

- The common edits (toggle a task, change status) take one click.
- Prose is read as rendered markdown and edited as raw source on demand.
- Saving is per field on blur or on the discrete action; there is no global
  save button.

## Alternatives considered

- **Edit-mode toggle** (the whole page flips to a form). Rejected: reintroduces
  the form the page was meant to replace.
- **Inline-everywhere with one uniform rule.** Rejected: makes one-click changes
  to status or tasks needlessly indirect.

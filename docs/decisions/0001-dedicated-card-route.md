# Dedicated card route (decouple from the external editor)

Date: 2026-06-27
Status: Accepted

## Context

Cards were viewed and edited in a modal designed for quick field edits. The full
content of a card lived in an external markdown editor, so the flow was: create a
card, open the modal, jump to the external editor for the full view, then return.
We wanted a card to be fully viewable and editable inside the app, with no
external hop.

## Decision

Give each card its own route, `/card/[project]/[filename]`, rendered as a full
page. The board and the command bar navigate to it instead of opening a modal.

## Consequences

- References render as real links with browser history; cards are deep-linkable.
- There is room to present a card as an article rather than a cramped form.
- The modal is retained only for the read-only archive view.
- Board navigation no longer threads a "card to open" through component state.

## Alternatives considered

- **Keep the edit modal.** Rejected: too small for full content, and a transient
  overlay cannot be linked to or carry history.
- **Full-screen modal.** Rejected: gains space but still has no real URL,
  history, or deep-linking.

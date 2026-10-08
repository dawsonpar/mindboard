# Decision: Remove the complexity field

Date: 2026-10-07
Status: Accepted

## Context

Cards carried an optional 1-8 complexity estimate, shown as a chip on the
card page and a badge on board cards, editable in the create and edit
forms, sortable, and settable from the CLI. In practice it was not used to
plan or prioritise work, so it added a field to every surface without
informing any decision.

## Decision

Remove complexity from the card schema, the API, the UI, sorting and the
CLI.

Existing card files may still contain a `## Complexity` section. The
parser drops that section instead of folding it into the Description
(the usual treatment for unknown headings under 0003), so the file loses it
on its next save. There is no bulk rewrite of stored cards.

The API ignores a `complexity` field in request bodies, so older clients
keep working.

## Consequences

- Section order is Title, Status, Priority, Schedule, Event Notes,
  Description, Tasks, References, Comments (amends 0003 and 0004).
- Cards that are never saved again keep a stale `## Complexity` section on
  disk; it is invisible and harmless.

## Alternatives considered

- **Hide the field but keep it in the schema.** Leaves dead code paths and
  a field agents would keep filling in.
- **Fold old sections into the Description.** Would surface meaningless
  "Complexity: 3" text on many cards.

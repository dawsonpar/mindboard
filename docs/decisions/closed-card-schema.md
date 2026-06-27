# Decision: Closed card schema (no custom sections)

Date: 2026-06-27
Status: Accepted

## Context

A MindBoard card is a markdown file split into `## ` sections. Historically the
parser kept every section, including ones it did not model, in a `rawSections`
array, and the writer replayed that array on save. This existed so that cards
co-edited in Obsidian would not lose unknown sections on a round-trip.

We have since decoupled from Obsidian. MindBoard is now the authoritative editor
and the schema is fixed and known.

## Decision

The card schema is **closed**. A card is exactly these sections, in this order:

    Title, Status, Priority, Complexity, Description, Tasks, References, Comments

There is no "custom section" concept. Any other `## Heading` found in a file is
**folded into the Description** as a `### Heading` subsection at parse time, and
the file is rewritten in canonical section order on the next save.

This is lossless (content is absorbed, not dropped), happens lazily per card on
its next save, and is idempotent: `splitIntoSections` only breaks on `## `, so a
folded `### Heading` stays inside the Description on every later read.

## Consequences

- `rawSections` / `RawSection` removed from the `Card` type, parser, writer,
  API routes, and the card page. `cardToMarkdown` is a simple canonical writer.
- The card page no longer needs a custom-section UI; custom content renders as
  ordinary `###` subheadings under Description (and appears in the outline).
- `mb import` applies the same fold so the CLI stays consistent.
- A card whose file has sections in a non-canonical order will be reordered on
  its next save. That is intentional: MindBoard owns the file format.

## Alternatives considered

- **Keep `rawSections` as a lossless safety net.** Rejected: it added real
  complexity (custom-section UI, writer ordering logic) to protect against a
  case that no longer occurs now that MindBoard owns the format.

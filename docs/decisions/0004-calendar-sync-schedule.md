# Decision: Card schedule with Google Calendar sync

Date: 2026-10-07
Status: Accepted

## Context

Cards are often planned for a specific day or time, but the schema had no
date field, so plans lived in free text and never reached a calendar.

## Decision

Add one optional `## Schedule` section, between Complexity and Description,
holding a single canonical string:

    2026-10-20               all-day
    2026-10-20 14:00         timed, one hour
    2026-10-20 14:00-15:30   timed, same-day range

Times are local to `GCAL_TIMEZONE`. Invalid content parses to no schedule
and a card error, like an invalid status.

Scheduled cards mirror to one dedicated Google calendar:

- **Auth:** a service account the calendar is shared with ("Make changes to
  events"). No user OAuth, no refresh tokens, and the credential can reach
  only that calendar.
- **Card to calendar:** after every cards API write the server queues a
  push that reads the card from disk and compares it with what it last
  pushed for that event (kept in a state file). Only a difference in
  schedule, summary or color calls Google, and only the changed fields are
  patched, so notes or reminders added in Google survive. The event id is the SHA-256 hex
  of `project/filename`, so nothing is written back into the card.
  Removing the schedule deletes the event; COMPLETED cards get a neutral
  color. Failed pushes are retried on every poll when the error is
  transient (network, 429, 5xx); a rejection (other 4xx) is logged and
  waits for the next card change. On startup every synced card is checked
  once, which backfills cards scheduled before sync existed.
- **Calendar to card:** a poller lists changed events with a sync token
  (`410` triggers one full resync). Google's version wins only while the
  card still matches what was last pushed; if the card changed since, it is
  re-pushed instead. A moved event rewrites the card's schedule; a deleted
  one clears it and appends a dated comment.
- Pushes and pulls for one event run strictly in order, so overlapping
  edits cannot land out of sequence.
- Events are matched to cards by id through the state file, because Google
  may omit metadata on deleted events. Event metadata is trusted only when
  it hashes to the event's own id and resolves inside the board root.
- The sync state lives on the server process's global object, because Next
  loads instrumentation and route handlers as separate module instances.
- If the state file is lost, MindBoard wins: every scheduled card is
  re-pushed on the next sync.
- `GCAL_EXCLUDE_PREFIX` has no default; leaving it unset syncs every
  project.
- Projects matching `GCAL_EXCLUDE_PREFIX` never sync.

## Operating it

Set these in the server environment; sync is off when the first two are
missing:

| Variable | Meaning |
|---|---|
| `GCAL_CALENDAR_ID` | the dedicated calendar's id |
| `GCAL_SA_KEY_FILE` | path to the service account JSON key (keep outside the repo) |
| `GCAL_EXCLUDE_PREFIX` | project prefix to skip, optional |
| `GCAL_TIMEZONE` | default `America/New_York` |
| `GCAL_POLL_SECONDS` | default `120` |
| `GCAL_STATE_FILE` | sync cursor, last pushed values and retry list; default next to the key |
| `MINDBOARD_PUBLIC_URL` | base URL for the card link in each event |

## Consequences

- Section order is now Title, Status, Priority, Complexity, Schedule,
  Description, Tasks, References, Comments (amends 0003).
- Multi-day events and timed events that cross midnight collapse to their
  start day when pulled back.
- Events created directly on the calendar without card metadata are ignored.
- Archived cards keep their event; the poller skips them.
- An invalid hand-written Schedule is reported as a card error and dropped
  on the card's next save.
- The one-hour default is wall-clock time, so a start-only event on a
  daylight-saving change day can run two hours or shift once.

## Alternatives considered

- **Agents writing events through a calendar connector.** One-way, only
  available inside agent sessions, and drifts from the card.
- **An ICS feed the calendar subscribes to.** One-way and refreshed by
  Google only every few hours.
- **User OAuth.** Needs a published consent screen to avoid seven-day token
  expiry, and grants access to every calendar.
- **Storing the event id in the card.** Requires a second write after the
  API call, which can race with user edits. A derived id avoids it.

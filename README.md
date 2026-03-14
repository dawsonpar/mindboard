# MindBoard

A file-based Kanban project management system built with Next.js.
Projects and cards are plain Markdown files — readable and editable by
both humans and AI agents without any special tooling.

---

## What Is This?

MindBoard visualizes Markdown files as a Kanban board in the style of
Obsidian/Jira. It is designed to be the shared project management layer
between you and any AI agents you work with.

- **Projects** = subdirectories under your configured root directory
- **Cards** = `.md` files inside a project directory
- **Columns** = the four statuses a card can hold

Because everything is plain Markdown on disk, agents can read and write
cards directly without going through the UI.

---

## Card Format

Each card is a `.md` file with specific `##` sections:

```markdown
## Title

<max 72 characters>

## Status

<TODO | IN PROGRESS | REVIEW | COMPLETED>

## Priority

<P0 | P1 | P2 | P3>

## Description

<free-form text>

## Tasks

- [ ] Incomplete task
- [x] Completed task

## Comments

<notes from users or agents>

## References

- other-card.md
```

Only `## Title` and `## Status` are required. Unknown sections are
ignored by the UI.

---

## Data Directory Structure

```
<rootDir>/
├── project-a/
│   ├── some-feature.md
│   └── bug-fix.md
└── project-b/
    └── research-spike.md
```

The root directory is configured in `mindboard.config.json`:

```json
{
  "rootDir": "/path/to/your/notes"
}
```

---

## Running the App

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or use the convenience script from anywhere
./start.sh
```

The app runs at `http://localhost:3000`.

**Production build:**
```bash
npm run build
npm start
```

---

## Configuration

`mindboard.config.json` at the project root controls runtime behavior:

| Field | Description |
|-------|-------------|
| `rootDir` | Absolute path to the directory containing your projects |
| `lastSelectedProject` | Persisted UI state — the last open project |
| `theme` | Color overrides for the UI |

---

## For AI Agents

Use the `/mindboard` Claude Code skill to interact with MindBoard. It
covers how to read projects, create cards, update statuses, and report
on board state without needing the UI.

**Quick reference:**
- List projects: `ls <rootDir>/`
- List cards: `ls <rootDir>/<project>/`
- Read a card: `cat <rootDir>/<project>/<card>.md`
- Find in-progress work: `grep -rl "^IN PROGRESS$" <rootDir>/`

When adding comments, always include your identity and the date:
```
[Agent — YYYY-MM-DD] Your note here.
```

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data layer:** Filesystem (no database)

---

## Project Structure

```
src/
├── app/
│   ├── api/          # REST endpoints for card/project CRUD
│   ├── settings/     # Settings page
│   └── page.tsx      # Main Kanban board view
├── components/       # UI components
├── hooks/            # React hooks
├── lib/              # Core logic (file parsing, config)
└── types/            # TypeScript types (Card, Config, etc.)
```

---

## Portability

MindBoard is self-contained. To run it on a new machine:

1. Clone the repo
2. Run `npm install`
3. Set `rootDir` in `mindboard.config.json` to your notes path
4. Run `npm run dev`

# MindBoard Implementation Plan

## Overview

MindBoard is a local-first Kanban board web app that reads and writes markdown files from a user-configured root directory. It is designed to be used by both humans and AI agents to track project progress. It visually mirrors Obsidian's design language.

---

## Tech Stack

- **Framework:** Next.js (App Router) with TypeScript
- **Styling:** Tailwind CSS with an Obsidian-inspired dark theme
- **File watching:** chokidar
- **Markdown parsing:** custom parser (sections are `##`-delimited, not frontmatter)
- **Real-time sync:** Server-Sent Events (SSE)
- **Drag and drop:** `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd)
- **Port:** 4737
- **Launcher:** Bash script (`start.sh`)

---

## Bash Launch Script

Create `start.sh` in the project root:

1. Check that Node.js is installed; exit with a helpful message if not
2. Run `npm install` if `node_modules` does not exist
3. Start the Next.js app on port 4737

---

## Configuration

**File:** `mindboard.config.json` in the project root (gitignored)

```json
{
  "rootDir": "/Users/dawsonpar/dp/notes/mindboard",
  "lastSelectedProject": null
}
```

- `rootDir`: absolute path to the notes directory. Each subdirectory is a project.
- `lastSelectedProject`: name of the last viewed project, restored on next launch.

If `mindboard.config.json` does not exist on first launch, redirect to a Settings page where the user must set `rootDir` before using the board.

---

## Directory & File Conventions

```
<rootDir>/
  <project-name>/       <- each subdirectory is a project
    <card-name>.md      <- each .md file is a card
```

---

## Card Markdown Schema

Each card is a `.md` file. Sections are delimited by `##` headings. Unknown/extra sections are silently ignored but preserved on write.

```markdown
## Title
Your title here (max 72 characters)

## Status
IN PROGRESS

## Priority
P1

## Description
Any free-form text.

## Tasks
- [ ] First task
- [x] Completed task

## Comments
Any free-form notes.
```

### Validation Rules

| Section | Rule |
|---|---|
| `## Title` | Required. Max 72 characters. If missing, show filename as fallback with warning icon. If over limit, show truncated with warning. |
| `## Status` | Must be one of: `TODO`, `IN PROGRESS`, `REVIEW`, `COMPLETED`. If missing or invalid, place card in `Uncategorized` column. |
| `## Priority` | Must be one of: `P0`, `P1`, `P2`, `P3`. P0 is highest priority. If missing or invalid, treat as unset (no badge, sorts last). |
| `## Tasks` | List of `- [ ]` (incomplete) and `- [x]` (complete) items. Used to compute progress. |
| `## Description` | Free-form text, no limits. |
| `## Comments` | Free-form text, no limits. |

**Critical:** When the app writes back to a `.md` file (e.g., status change), it must preserve all existing sections and their content, including unknown sections. Only the changed field should be updated.

---

## API Routes

All routes under `/api`.

### Config
- `GET /api/config` - read current config
- `PUT /api/config` - update config (partial config object)

### Projects
- `GET /api/projects` - list all subdirectory names under `rootDir`
- `POST /api/projects` - create project (body: `{ name: string }`), creates subdirectory

### Cards
- `GET /api/cards?project=<name>` - list all parsed cards for a project
- `POST /api/cards` - create card (body: `{ project, title, status?, priority?, description? }`). Filename derived from title: lowercase, spaces to hyphens, strip non-alphanumeric, max 60 chars, append `.md`
- `PUT /api/cards/:project/:filename` - update card. Body is full card object. Rewrites `.md` file preserving section order.

### Real-time
- `GET /api/events` - SSE endpoint streaming file change events to connected clients

---

## File Watching

Use chokidar to watch `rootDir` recursively. Initialize as a singleton when the server starts.

**Echo prevention:** After the app writes a file, ignore file system events for that path for 500ms.

**SSE events emitted:**

```json
{ "type": "card_updated", "project": "project-name", "filename": "card-name.md" }
{ "type": "card_added", "project": "project-name", "filename": "card-name.md" }
{ "type": "card_deleted", "project": "project-name", "filename": "card-name.md" }
```

**Conflict handling:** If an SSE event arrives while the user has unsaved changes in the card modal for the same file, show a non-blocking toast: "This card was updated externally. Reload to see changes."

---

## UI Structure

### Pages
- `/` - main Kanban board
- `/settings` - settings form (rootDir input, save button)

### Navigation Bar
- App name "MindBoard" on the left
- Project selector dropdown (lists all projects, remembers last selection via config)
- "New Project" button
- "New Card" button (disabled if no project selected)
- Sort control
- Settings icon linking to `/settings`

### Kanban Board
Five columns in order: `TODO` | `IN PROGRESS` | `REVIEW` | `COMPLETED` | `Uncategorized`

- `Uncategorized` only renders if cards with invalid/missing status exist
- Cards within columns ordered by the active sort

### Sort Options

Dropdown with four options:

1. **Priority** (default) - P0 first, P3 last, unset last
2. **Alphabetical** - A-Z by title
3. **Created** - newest first (file birthtime)
4. **Last Modified** - most recently modified first (file mtime)

### KanbanCard (compact, in-column view)
- Priority badge pill (P0=red, P1=orange, P2=yellow, P3=blue)
- Title text
- Task progress bar (e.g., "3/5") - hidden if no tasks exist
- Click opens CardModal
- Draggable between columns

### CardModal (detail view)
Large centered modal showing:
- Title (editable inline, inline error if empty or over 72 chars)
- Status dropdown (TODO / IN PROGRESS / REVIEW / COMPLETED)
- Priority dropdown (P0 / P1 / P2 / P3 / Unset)
- Description (editable textarea)
- Tasks list (interactive checkboxes, toggling updates the file)
- Comments (editable textarea)
- "Open in Obsidian" button - opens `obsidian://open?path=<absolute-path-to-file>`
- Auto-saves on field blur (debounced 800ms), no explicit Save button

### CreateCardModal
- Title (required, max 72 chars, inline validation)
- Status dropdown (default: TODO)
- Priority dropdown (default: unset)
- Description (optional textarea)
- Submit creates the `.md` file and closes the modal

### CreateProjectModal
- Single text input for project name
- Submit creates the directory under `rootDir`

### Settings Page
- Text input for `rootDir` with label: "Absolute path to your notes directory"
- Save button writes to `mindboard.config.json`
- On save, reinitialize the file watcher on the new path

### Toast Notifications
- Non-blocking, bottom-right corner
- Used for: external file change conflicts, successful creation, errors

---

## Drag and Drop

Cards are draggable between columns using `@hello-pangea/dnd`. Dropping a card into a new column:
1. Updates the `## Status` section in the `.md` file
2. Re-renders the board

---

## Obsidian Visual Theme

| Element | Value |
|---|---|
| Main background | `#1e1e1e` |
| Panel/sidebar background | `#252525` |
| Card background | `#2d2d2d` |
| Accent color | `#7c6f9f` (Obsidian purple) |
| Primary text | `#dcddde` |
| Muted text | `#999999` |
| Borders | `1px solid #3a3a3a` |
| Card corners | `6px` border-radius |
| Input corners | `4px` border-radius |
| Font | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| Depth | Borders only, no drop shadows |

---

## Error Guardrails

| Condition | Behavior |
|---|---|
| Invalid/missing status | Card placed in `Uncategorized` column with warning icon |
| Title over 72 chars | Truncated display with warning icon |
| Missing title | Show filename as fallback with warning icon |
| Unknown `##` sections | Silently ignore in UI, preserve in file on write |
| `rootDir` not set | Redirect to `/settings` |
| `rootDir` doesn't exist | Error banner on board with link to settings |
| Empty project | Empty state message in each column |

---

## File Structure

```
mindboard/
  start.sh
  mindboard.config.json          <- gitignored
  .gitignore
  package.json
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  docs/
    implementation-plan.md
  src/
    app/
      layout.tsx
      page.tsx                   <- board page
      settings/
        page.tsx
      api/
        config/
          route.ts
        projects/
          route.ts
        cards/
          route.ts
          [project]/
            [filename]/
              route.ts
        events/
          route.ts
    components/
      KanbanBoard.tsx
      KanbanColumn.tsx
      KanbanCard.tsx
      CardModal.tsx
      CreateCardModal.tsx
      CreateProjectModal.tsx
      SortFilterBar.tsx
      Toast.tsx
      Nav.tsx
    lib/
      cardParser.ts              <- parse .md content -> Card object
      cardWriter.ts              <- Card object -> .md string
      configManager.ts           <- read/write mindboard.config.json
      fileWatcher.ts             <- chokidar singleton
      sseManager.ts              <- SSE client registry and broadcast
    types/
      card.ts
      config.ts
```

---

## Types

```typescript
// types/card.ts
export type CardStatus = 'TODO' | 'IN PROGRESS' | 'REVIEW' | 'COMPLETED';
export type CardPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface Card {
  filename: string;
  project: string;
  absolutePath: string;
  title: string;
  status: CardStatus | null;       // null = invalid or missing
  priority: CardPriority | null;   // null = unset
  description: string;
  tasks: Task[];
  comments: string;
  createdAt: Date;
  modifiedAt: Date;
  hasErrors: boolean;
  errorMessage?: string;
}

export interface Task {
  text: string;
  completed: boolean;
}

// types/config.ts
export interface MindBoardConfig {
  rootDir: string;
  lastSelectedProject: string | null;
}
```

---

## Implementation Phases

### Phase 1 - Project Bootstrap
1. `npx create-next-app@latest` with TypeScript, Tailwind, App Router
2. Set port to 4737
3. Create `start.sh`
4. Configure Tailwind with Obsidian color tokens
5. Set up `.gitignore` (include `mindboard.config.json`)

### Phase 2 - Core Library
1. `types/card.ts` and `types/config.ts`
2. `lib/configManager.ts`
3. `lib/cardParser.ts`
4. `lib/cardWriter.ts`

### Phase 3 - API Routes
1. Config routes (`/api/config`)
2. Projects routes (`/api/projects`)
3. Cards routes (`/api/cards`)
4. SSE + file watcher (`lib/fileWatcher.ts`, `lib/sseManager.ts`, `/api/events`)

### Phase 4 - UI
1. Obsidian theme in Tailwind config
2. `Nav.tsx` with project selector
3. `KanbanBoard.tsx` and `KanbanColumn.tsx`
4. `KanbanCard.tsx` with progress bar and priority badge
5. `CardModal.tsx` with auto-save
6. `CreateCardModal.tsx` and `CreateProjectModal.tsx`
7. `SortFilterBar.tsx`
8. `Toast.tsx`
9. Settings page
10. Drag and drop via `@hello-pangea/dnd`
11. SSE client hook for real-time updates

### Phase 5 - Polish & Guardrails
1. All error states (invalid status, long title, missing rootDir, etc.)
2. Debounce logic for echo loop prevention
3. Toast on external conflict
4. Empty state views

---

Each phase should be independently functional before moving to the next. The agent should work through them in order.

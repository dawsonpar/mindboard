---
name: mindboard
description: Reference the MindBoard project management system to read, create, or update project cards. Use when you need to check project status, view tasks, manage cards, or coordinate work across projects.
---

# MindBoard

MindBoard is a file-based Kanban project management system. Projects and
cards are plain Markdown files on disk. This skill teaches you how to
read, create, and update them directly — no API needed.

---

## Key Paths

The data root directory is set in `mindboard.config.json` at the project
root under the `rootDir` field. Read this file first to find the correct
path before performing any file operations.

```bash
cat mindboard.config.json
# Look for: "rootDir": "<path>"
```

Each **subdirectory** under `rootDir` is a **project**.
Each **`.md` file** inside a project directory is a **card**.

---

## Card File Format

Cards are Markdown files with specific `##` sections. All sections are
optional except `## Title` and `## Status`.

```markdown
## Title

<title — max 72 characters>

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

<free-form notes from users or agents>

## References

- other-card.md
- https://external-link.com
```

**Valid statuses:** `TODO`, `IN PROGRESS`, `REVIEW`, `COMPLETED`
**Valid priorities:** `P0` (critical), `P1` (high), `P2` (medium), `P3` (low)

---

## Reading the Board

### List all projects
```bash
ls <rootDir>/
```

### List cards in a project
```bash
ls <rootDir>/<project-name>/
```

### Read a card
```bash
cat "<rootDir>/<project>/<card>.md"
```

### Find all cards by status
```bash
grep -rl "^IN PROGRESS$" <rootDir>/
```

---

## Creating a Project

```bash
mkdir "<rootDir>/<project-name>"
```

---

## Creating a Card

Create a new `.md` file inside the project directory using this template:

```markdown
## Title

<Your title here — max 72 characters>

## Status

TODO

## Priority

P2

## Description

<Describe the task>

## Tasks

- [ ] First task

## Comments

## References
```

Save it as: `<rootDir>/<project>/<card-name>.md`

Use kebab-case for filenames (e.g., `add-login-flow.md`).

---

## Updating a Card

Edit the relevant section directly in the `.md` file. When changing
status, update the line immediately following `## Status`.

**Moving a card to IN PROGRESS:**
```markdown
## Status

IN PROGRESS
```

**Checking off a task:**
Change `- [ ]` to `- [x]` for completed tasks.

**Adding a comment (agents should always identify themselves):**
```markdown
## Comments

[Agent — YYYY-MM-DD] Reviewed implementation. Blocked on API key access.
```

---

## Workflow for Agents

When starting work on a task from MindBoard:
1. Read `mindboard.config.json` to get `rootDir`
2. Find the relevant card and read it fully
3. Update status to `IN PROGRESS`
4. Work through the `## Tasks` checklist, checking off items as you go
5. Add a `## Comments` entry summarizing what you did
6. Update status to `REVIEW` or `COMPLETED` when done

When reporting on the board:
- Summarize each project with card counts per status column
- Flag any `P0` or `P1` cards not yet `IN PROGRESS`
- Note cards that are `IN PROGRESS` with all tasks checked (likely stale)

---

## Card Progress Calculation

Progress = completed tasks / total tasks

A card with no tasks is treated as 0% progress until moved to COMPLETED.

---

## Common Queries

**What's currently in progress across all projects?**
```bash
grep -rl "^IN PROGRESS$" <rootDir>/
```

**What high-priority items are not started?**
```bash
grep -rl "^TODO$" <rootDir>/ | xargs grep -l "^P0\|^P1"
```

**Show all cards in a project with their status:**
```bash
for f in <rootDir>/<project>/*.md; do
  echo "=== $f ==="; grep -A1 "^## Status" "$f" | tail -1; done
```

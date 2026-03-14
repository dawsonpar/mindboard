import type { Card, CardPriority, CardStatus, RawSection, Task } from '@/types/card';

const VALID_STATUSES: CardStatus[] = ['TODO', 'IN PROGRESS', 'REVIEW', 'COMPLETED'];
const VALID_PRIORITIES: CardPriority[] = ['P0', 'P1', 'P2', 'P3'];
const TITLE_MAX_LENGTH = 72;

interface FileStats {
  birthtimeMs: number;
  mtimeMs: number;
}

function splitIntoSections(content: string): RawSection[] {
  const sections: RawSection[] = [];
  const lines = content.split('\n');
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentHeading !== null) {
        sections.push({
          heading: currentHeading,
          content: currentLines.join('\n').trim(),
        });
      }
      currentHeading = line.slice(3).trim();
      currentLines = [];
    } else if (currentHeading !== null) {
      currentLines.push(line);
    }
  }

  if (currentHeading !== null) {
    sections.push({
      heading: currentHeading,
      content: currentLines.join('\n').trim(),
    });
  }

  return sections;
}

function findSection(sections: RawSection[], heading: string): string | undefined {
  const section = sections.find(
    (s) => s.heading.toLowerCase() === heading.toLowerCase()
  );
  return section?.content;
}

function parseStatus(raw: string | undefined): CardStatus | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (VALID_STATUSES.includes(trimmed as CardStatus)) {
    return trimmed as CardStatus;
  }
  return null;
}

function parsePriority(raw: string | undefined): CardPriority | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (VALID_PRIORITIES.includes(trimmed as CardPriority)) {
    return trimmed as CardPriority;
  }
  return null;
}

function parseTasks(raw: string | undefined): Task[] {
  if (!raw) return [];

  const tasks: Task[] = [];
  const lines = raw.split('\n');

  for (const line of lines) {
    const incompleteMatch = line.match(/^- \[ \] (.+)$/);
    if (incompleteMatch) {
      tasks.push({ text: incompleteMatch[1], completed: false });
      continue;
    }

    const completeMatch = line.match(/^- \[x\] (.+)$/);
    if (completeMatch) {
      tasks.push({ text: completeMatch[1], completed: true });
    }
  }

  return tasks;
}

function filenameWithoutExtension(filename: string): string {
  return filename.replace(/\.md$/i, '');
}

export function parseCardContent(
  content: string,
  filename: string,
  project: string,
  absolutePath: string,
  stats: FileStats
): Card {
  const errorMessages: string[] = [];
  let hasErrors = false;

  const rawSections = splitIntoSections(content);

  const titleRaw = findSection(rawSections, 'Title');
  let title: string;
  if (titleRaw === undefined) {
    title = filenameWithoutExtension(filename);
    hasErrors = true;
    errorMessages.push('Missing "## Title" section, using filename as fallback');
  } else {
    title = titleRaw;
  }

  if (title.length > TITLE_MAX_LENGTH) {
    hasErrors = true;
    errorMessages.push(
      `Title exceeds ${TITLE_MAX_LENGTH} characters (${title.length} chars)`
    );
  }

  const statusRaw = findSection(rawSections, 'Status');
  const status = parseStatus(statusRaw);
  if (statusRaw === undefined) {
    hasErrors = true;
    errorMessages.push('Missing "## Status" section');
  } else if (status === null) {
    hasErrors = true;
    errorMessages.push(
      `Invalid status "${statusRaw.trim()}", must be one of: ${VALID_STATUSES.join(', ')}`
    );
  }

  const priorityRaw = findSection(rawSections, 'Priority');
  const priority = parsePriority(priorityRaw);

  const description = findSection(rawSections, 'Description') ?? '';
  const tasks = parseTasks(findSection(rawSections, 'Tasks'));
  const comments = findSection(rawSections, 'Comments') ?? '';

  return {
    filename,
    project,
    absolutePath,
    title,
    status,
    priority,
    description,
    tasks,
    comments,
    createdAt: new Date(stats.birthtimeMs).toISOString(),
    modifiedAt: new Date(stats.mtimeMs).toISOString(),
    hasErrors,
    errorMessages,
    rawSections,
  };
}

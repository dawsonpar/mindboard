import type { Card, Task } from '@/types/card';

function formatTasks(tasks: Task[]): string {
  return tasks
    .map((t) => (t.completed ? `- [x] ${t.text}` : `- [ ] ${t.text}`))
    .join('\n');
}

function formatReferences(references: string[]): string {
  return references.map((r) => `- ${r}`).join('\n');
}

/**
 * Serialize a card to its canonical markdown form: a fixed section order with
 * exactly the known sections. There is no "custom section" concept; any extra
 * content was folded into the Description by the parser.
 */
export function cardToMarkdown(card: Card): string {
  const lines: string[] = [];

  const section = (heading: string, content: string) => {
    lines.push(`## ${heading}`, '');
    if (content) lines.push(content, '');
  };

  section('Title', card.title);
  if (card.status) section('Status', card.status);
  if (card.priority) section('Priority', card.priority);
  if (card.complexity != null) section('Complexity', String(card.complexity));
  section('Description', card.description);
  if (card.tasks.length > 0) section('Tasks', formatTasks(card.tasks));
  if (card.references.length > 0) section('References', formatReferences(card.references));
  if (card.comments.trim()) section('Comments', card.comments);

  let result = lines.join('\n');
  if (!result.endsWith('\n')) result += '\n';
  return result;
}

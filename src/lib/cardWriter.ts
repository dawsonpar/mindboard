import type { Card, Task } from '@/types/card';

const KNOWN_SECTIONS = new Set([
  'title',
  'status',
  'priority',
  'complexity',
  'description',
  'tasks',
  'references',
  'comments',
]);

function formatTasks(tasks: Task[]): string {
  return tasks
    .map((t) => (t.completed ? `- [x] ${t.text}` : `- [ ] ${t.text}`))
    .join('\n');
}

function formatReferences(references: string[]): string {
  return references.map((r) => `- ${r}`).join('\n');
}

function getKnownSectionContent(card: Card, heading: string): string {
  switch (heading.toLowerCase()) {
    case 'title':
      return card.title;
    case 'status':
      return card.status ?? '';
    case 'priority':
      return card.priority ?? '';
    case 'complexity':
      return card.complexity != null ? String(card.complexity) : '';
    case 'description':
      return card.description;
    case 'tasks':
      return formatTasks(card.tasks);
    case 'references':
      return formatReferences(card.references);
    case 'comments':
      return card.comments;
    default:
      return '';
  }
}

export function cardToMarkdown(card: Card): string {
  const lines: string[] = [];
  const writtenSections = new Set<string>();

  const hasComplexitySection = card.rawSections.some(
    (s) => s.heading.toLowerCase() === 'complexity'
  );

  const writeComplexity = () => {
    lines.push('## Complexity');
    lines.push('');
    lines.push(String(card.complexity));
    lines.push('');
    writtenSections.add('complexity');
  };

  for (const section of card.rawSections) {
    const key = section.heading.toLowerCase();
    writtenSections.add(key);

    if (KNOWN_SECTIONS.has(key)) {
      // Omit References section entirely when empty
      if (key === 'references' && card.references.length === 0) continue;
      // Omit Complexity section when unset
      if (key === 'complexity' && card.complexity == null) continue;

      const content = getKnownSectionContent(card, section.heading);
      lines.push(`## ${section.heading}`);
      if (content) {
        lines.push('');
        lines.push(content);
      }
      lines.push('');
    } else {
      lines.push(`## ${section.heading}`);
      if (section.content) {
        lines.push('');
        lines.push(section.content);
      }
      lines.push('');
    }

    // Keep Complexity directly after Priority when the card lacks its own
    // Complexity section.
    if (key === 'priority' && card.complexity != null && !hasComplexitySection) {
      writeComplexity();
    }
  }

  const appendIfMissing = (heading: string) => {
    if (writtenSections.has(heading.toLowerCase())) return;
    const content = getKnownSectionContent(card, heading);
    if (!content && card.tasks.length === 0) return;

    lines.push(`## ${heading}`);
    if (content) {
      lines.push('');
      lines.push(content);
    }
    lines.push('');
  };

  appendIfMissing('Title');
  appendIfMissing('Status');
  appendIfMissing('Priority');
  if (card.complexity != null && !writtenSections.has('complexity')) {
    writeComplexity();
  }
  appendIfMissing('Description');
  appendIfMissing('Tasks');

  // Append References only when non-empty and not already written
  if (card.references.length > 0 && !writtenSections.has('references')) {
    const content = formatReferences(card.references);
    lines.push('## References');
    lines.push('');
    lines.push(content);
    lines.push('');
  }

  appendIfMissing('Comments');

  let result = lines.join('\n');
  if (!result.endsWith('\n')) {
    result += '\n';
  }

  return result;
}

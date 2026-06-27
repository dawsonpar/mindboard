import { isValidElement, type ReactNode } from 'react';

/** Stable anchor id from heading text, e.g. "Confirmed Anchors" -> "h-confirmed-anchors". */
export function slugify(text: string): string {
  return (
    'h-' +
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  );
}

export interface Heading {
  /** 1 for #/##, 2 for ### (used for outline indentation). */
  level: number;
  text: string;
  id: string;
}

/** Parse #/##/### headings out of markdown, skipping fenced code blocks. */
export function extractHeadings(md: string): Heading[] {
  const lines = md.replace(/\r/g, '').split('\n');
  const out: Heading[] = [];
  let inFence = false;
  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,3})\s+(.+)/.exec(line);
    if (m) {
      const text = m[2].trim();
      out.push({ level: m[1].length <= 2 ? 1 : 2, text, id: slugify(text) });
    }
  }
  return out;
}

/** Flatten React children to a plain string (for heading id generation). */
export function nodeToText(node: ReactNode): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (isValidElement(node)) {
    return nodeToText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

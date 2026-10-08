import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCardContent } from './cardParser.ts';
import { cardToMarkdown } from './cardWriter.ts';

const STATS = { birthtimeMs: 0, mtimeMs: 0 };
const LEGACY = `## Title

Sample card

## Status

TODO

## Complexity

3

## Description

Body

## Extra

keep me
`;

const parse = (md: string) => parseCardContent(md, 'sample-card.md', 'sample-project', '/tmp/sample-card.md', STATS);

test('retired Complexity section is dropped, not folded into the description', () => {
  assert.equal(parse(LEGACY).description, 'Body\n\n### Extra\n\nkeep me');
});

test('retired Complexity section does not flag the card as broken', () => {
  assert.equal(parse(LEGACY).hasErrors, false);
});

test('saving a legacy card removes the Complexity section', () => {
  assert.doesNotMatch(cardToMarkdown(parse(LEGACY)), /Complexity/);
});

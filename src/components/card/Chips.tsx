'use client';

import type { CardStatus, CardPriority } from '@/types/card';
import { ChipMenu, type ChipMenuItem } from './ChipMenu';

/* ---------------- Status ---------------- */

const STATUS: { value: CardStatus; label: string; cls: string }[] = [
  { value: 'TODO', label: 'To Do', cls: 'status-todo' },
  { value: 'IN PROGRESS', label: 'In Progress', cls: 'status-inprogress' },
  { value: 'REVIEW', label: 'Review', cls: 'status-review' },
  { value: 'COMPLETED', label: 'Completed', cls: 'status-completed' },
];

export function StatusChip({
  value,
  onChange,
}: {
  value: CardStatus | null;
  onChange: (v: CardStatus) => void;
}) {
  const meta = value ? STATUS.find((s) => s.value === value) : null;
  const items: ChipMenuItem[] = STATUS.map((s) => ({
    value: s.value,
    node: <span className={`status-pill ${s.cls}`}>{s.label}</span>,
  }));
  return (
    <ChipMenu ariaLabel="Set status" items={items} onSelect={(v) => onChange(v as CardStatus)}>
      {meta ? (
        <span className={`status-pill ${meta.cls}`}>{meta.label}</span>
      ) : (
        <span className="chip-ghost">Set status</span>
      )}
    </ChipMenu>
  );
}

/* ---------------- Priority ---------------- */

const PRIORITIES: CardPriority[] = ['P0', 'P1', 'P2', 'P3'];
const PRIORITY_BG: Record<CardPriority, string> = {
  P0: 'bg-priority-p0',
  P1: 'bg-priority-p1',
  P2: 'bg-priority-p2',
  P3: 'bg-priority-p3',
};

function priorityPill(p: CardPriority) {
  return (
    <span
      className={`${PRIORITY_BG[p]} text-obsidian-bg text-[11px] font-semibold px-2 py-[2px] rounded-full leading-snug`}
    >
      {p}
    </span>
  );
}

export function PriorityChip({
  value,
  onChange,
}: {
  value: CardPriority | null;
  onChange: (v: CardPriority | null) => void;
}) {
  const items: ChipMenuItem[] = [
    ...PRIORITIES.map((p) => ({ value: p, node: priorityPill(p) })),
    { value: '__unset', node: <span className="chip-ghost">Unset</span> },
  ];
  return (
    <ChipMenu
      ariaLabel="Set priority"
      items={items}
      onSelect={(v) => onChange(v === '__unset' ? null : (v as CardPriority))}
    >
      {value ? priorityPill(value) : <span className="chip-ghost">+ priority</span>}
    </ChipMenu>
  );
}

/* ---------------- Complexity ---------------- */

const COMPLEXITY = [1, 2, 3, 4, 5, 6, 7, 8];

function cxPill(n: number) {
  return (
    <span className="bg-obsidian-text text-obsidian-bg text-[11px] font-semibold px-2 py-[2px] rounded-full leading-snug">
      {n}
    </span>
  );
}

export function ComplexityChip({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const items: ChipMenuItem[] = [
    { value: '__unset', node: <span className="chip-ghost">Unset</span> },
    ...COMPLEXITY.map((n) => ({ value: String(n), node: cxPill(n) })),
  ];
  return (
    <ChipMenu
      ariaLabel="Set complexity"
      items={items}
      onSelect={(v) => onChange(v === '__unset' ? null : Number(v))}
    >
      {value != null ? cxPill(value) : <span className="chip-ghost">+ cx</span>}
    </ChipMenu>
  );
}

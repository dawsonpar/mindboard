'use client';

import { useEffect, useRef, useState } from 'react';

const inputClass =
  'bg-obsidian-bg border border-obsidian-border rounded-input text-obsidian-text px-2 py-1 text-sm focus:outline-none focus:border-obsidian-accent';

/**
 * Human label for a canonical schedule string. Full: "Tue, Oct 20, 2:00 PM-3:00 PM".
 * Compact (board cards): "Oct 20, 2:00 PM".
 */
export function scheduleLabel(schedule: string, isCompact = false): string {
  const [date, range] = schedule.split(' ');
  const day = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: isCompact ? undefined : 'short', month: 'short', day: 'numeric',
  });
  if (!range) return day;
  const time = (hhmm: string) =>
    new Date(`${date}T${hhmm}:00`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const times = range.split('-');
  return `${day}, ${(isCompact ? times.slice(0, 1) : times).map(time).join('-')}`;
}

export function ScheduleChip({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        aria-label="Set schedule"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer"
      >
        {value ? (
          <span className="card-chip chip-date">{scheduleLabel(value)}</span>
        ) : (
          <span className="card-chip chip-ghost">+ date</span>
        )}
      </button>
      {open && (
        <ScheduleForm
          value={value}
          onSubmit={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ScheduleForm({ value, onSubmit }: { value: string | null; onSubmit: (v: string | null) => void }) {
  const [initialDate, initialRange = ''] = (value ?? '').split(' ');
  const [initialStart = '', initialEnd = ''] = initialRange.split('-');
  const [date, setDate] = useState(initialDate);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  const isEndValid = !end || (start !== '' && end > start);
  const canSave = date !== '' && isEndValid;

  function save() {
    if (!canSave) return;
    onSubmit([date, start && (end ? `${start}-${end}` : start)].filter(Boolean).join(' '));
  }

  return (
    <div className="card-popover gap-2 p-3" role="dialog" aria-label="Schedule">
      <input type="date" aria-label="Date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
      <div className="flex items-center gap-2">
        <input type="time" aria-label="Start time" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
        <span className="text-obsidian-muted text-sm">to</span>
        <input type="time" aria-label="End time" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <p className="text-xs text-obsidian-muted">No time makes it all-day. No end makes it one hour.</p>
      {!isEndValid && (
        <p className="text-xs text-obsidian-text">{start ? 'End must be after the start time.' : 'Set a start time first.'}</p>
      )}
      <div className="flex justify-between gap-2">
        {value ? (
          <button type="button" className="card-pop-item" onClick={() => onSubmit(null)}>
            Clear
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="card-pop-item" disabled={!canSave} onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DateSelect } from './DateSelect';
import { TimeSelect } from './TimeSelect';

const inputClass =
  'bg-obsidian-bg border border-obsidian-border rounded-input text-obsidian-text px-2 py-1 text-sm focus:outline-none focus:border-obsidian-accent';

/**
 * Human label for a canonical schedule string. Full: "Oct 20, 2:00-3:30 PM".
 * Compact (board cards): "Oct 20, 2:00 PM".
 */
export function scheduleLabel(schedule: string, isCompact = false): string {
  const [date, range] = schedule.split(' ');
  const day = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (!range) return day;
  const time = (hhmm: string) =>
    new Date(`${date}T${hhmm}:00`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const [start, end] = range.split('-').map(time);
  if (isCompact || !end) return `${day}, ${start}`;
  return `${day}, ${shareDayPeriod(start, end)}`;
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
    <div ref={wrapRef} className="relative inline-flex min-w-0">
      <button
        type="button"
        aria-label="Set schedule"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer min-w-0 max-w-full"
      >
        {value ? (
          <span className="card-chip chip-date">
            <span>{scheduleLabel(value)}</span>
          </span>
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
  const [isAllDay, setIsAllDay] = useState(initialStart === '');
  const [start, setStart] = useState(initialStart || DEFAULT_START);
  const [end, setEnd] = useState(initialEnd || addHour(initialStart || DEFAULT_START));
  const popRef = useRef<HTMLDivElement>(null);

  // Right-anchored to the chip; a short chip near the left edge would push it off screen.
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!pop) return;
    const left = pop.getBoundingClientRect().left;
    if (left < VIEWPORT_GUTTER) pop.style.transform = `translateX(${VIEWPORT_GUTTER - left}px)`;
  }, []);

  const isTimeValid = isAllDay || (start !== '' && end > start);
  const canSave = date !== '' && isTimeValid;

  function save() {
    if (!canSave) return;
    onSubmit(isAllDay ? date : `${date} ${start}-${end}`);
  }

  return (
    <div
      ref={popRef}
      className="card-popover schedule-editor"
      role="dialog"
      aria-label="Schedule"
    >
      <DateSelect ariaLabel="Date" className={inputClass} value={date} onChange={setDate} />
      <fieldset
        disabled={isAllDay}
        aria-label="Time"
        className={`flex min-w-0 items-center gap-2 transition-opacity duration-150 ${isAllDay ? 'opacity-40' : ''}`}
      >
        <TimeSelect ariaLabel="Start time" className={inputClass} value={start} onChange={setStart} />
        <span className="text-obsidian-muted text-sm">to</span>
        <TimeSelect ariaLabel="End time" className={inputClass} value={end} onChange={setEnd} />
      </fieldset>
      <label className="schedule-row flex items-center justify-between gap-3 text-sm text-obsidian-text cursor-pointer">
        All day
        <button
          type="button"
          role="switch"
          aria-checked={isAllDay}
          onClick={() => setIsAllDay((v) => !v)}
          className={`schedule-switch${isAllDay ? ' is-on' : ''}`}
        >
          <span className="schedule-switch-knob" />
        </button>
      </label>
      {!isTimeValid && <p className="text-xs text-obsidian-text">End must be after the start time.</p>}
      <div className="schedule-row flex justify-between gap-2">
        {value ? (
          <button type="button" className="card-pop-item schedule-action" onClick={() => onSubmit(null)}>
            Clear
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="card-pop-item schedule-action" disabled={!canSave} onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}

const DEFAULT_START = '09:00';
const VIEWPORT_GUTTER = 16;

function addHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "2:00 PM" + "3:30 PM" becomes "2:00-3:30 PM" when both share the same AM/PM suffix. */
function shareDayPeriod(start: string, end: string): string {
  const suffix = (t: string) => t.match(/\s*\D+$/)?.[0] ?? '';
  const startSuffix = suffix(start);
  return startSuffix && startSuffix === suffix(end) ? `${start.slice(0, -startSuffix.length)}-${end}` : `${start}-${end}`;
}

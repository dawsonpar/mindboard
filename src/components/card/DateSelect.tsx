'use client';

import { useEffect, useRef, useState } from 'react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const GRID_CELLS = 42;

interface DateSelectProps {
  /** `YYYY-MM-DD`, or '' when unset. */
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className: string;
}

/** Themed month calendar matching the other card popovers. */
export function DateSelect({ value, onChange, ariaLabel, className }: DateSelectProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => monthStart(value ? parseDate(value) : new Date()));
  const wrapRef = useRef<HTMLDivElement>(null);
  const today = toValue(new Date());

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function toggle() {
    if (!open && value) setView(monthStart(parseDate(value)));
    setOpen((o) => !o);
  }

  const shiftMonth = (delta: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));

  return (
    <div ref={wrapRef} className="time-select">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${className} w-full flex items-center justify-between gap-2 text-left`}
        onClick={toggle}
      >
        <span className={`truncate${value ? '' : ' text-obsidian-muted'}`}>{value ? formatLong(value) : 'Pick a date'}</span>
        <CalendarIcon />
      </button>
      {open && (
        <div className="date-select-pop" role="dialog" aria-label="Choose date">
          <div className="date-head">
            <button type="button" className="date-nav" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
              <Chevron direction="left" />
            </button>
            <span>{view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
            <button type="button" className="date-nav" aria-label="Next month" onClick={() => shiftMonth(1)}>
              <Chevron direction="right" />
            </button>
          </div>
          <div className="date-grid" role="grid">
            {WEEKDAYS.map((d) => (
              <span key={d} className="date-weekday">{d}</span>
            ))}
            {monthCells(view).map((day) => {
              const dayValue = toValue(day);
              const classes = [
                'date-day',
                day.getMonth() !== view.getMonth() && 'is-outside',
                dayValue === today && 'is-today',
                dayValue === value && 'is-selected',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={dayValue}
                  type="button"
                  className={classes}
                  aria-pressed={dayValue === value}
                  aria-label={formatLong(dayValue)}
                  onClick={() => {
                    onChange(dayValue);
                    setOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg className="shrink-0" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 6.5h12M5.5 1.75v2.5M10.5 1.75v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M10 4L6 8l4 4' : 'M6 4l4 4-4 4'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Six weeks starting on the Sunday on or before the 1st. */
function monthCells(view: Date): Date[] {
  const first = new Date(view.getFullYear(), view.getMonth(), 1 - view.getDay());
  return Array.from({ length: GRID_CELLS }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function parseDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatLong(value: string): string {
  return parseDate(value).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

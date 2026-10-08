'use client';

import { useEffect, useRef, useState } from 'react';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const PERIODS = ['AM', 'PM'] as const;

interface TimeSelectProps {
  /** 24-hour `HH:MM`. */
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className: string;
  align?: 'start' | 'end';
}

/** Themed time picker: hours 1-12, minutes in 5-minute steps, AM/PM. */
export function TimeSelect({ value, onChange, ariaLabel, className, align = 'start' }: TimeSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { hour12, minute, period } = toParts(value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const set = (parts: Partial<ReturnType<typeof toParts>>) => onChange(fromParts({ hour12, minute, period, ...parts }));

  return (
    <div ref={wrapRef} className="time-select flex-1 min-w-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${className} w-full text-left`}
        onClick={() => setOpen((o) => !o)}
      >
        {`${hour12}:${String(minute).padStart(2, '0')} ${period}`}
      </button>
      {open && (
        <div className={`time-select-pop${align === 'end' ? ' is-end' : ''}`}>
          <Column label="Hour" options={HOURS} selected={hour12} format={String} onPick={(h) => set({ hour12: h })} />
          <Column
            label="Minute"
            options={MINUTES}
            selected={minute}
            format={(m) => String(m).padStart(2, '0')}
            onPick={(m) => set({ minute: m })}
          />
          <Column label="AM or PM" options={[...PERIODS]} selected={period} format={String} onPick={(p) => set({ period: p })} />
        </div>
      )}
    </div>
  );
}

function Column<T extends string | number>(props: {
  label: string;
  options: T[];
  selected: T;
  format: (v: T) => string;
  onPick: (v: T) => void;
}) {
  return (
    <div className="time-col" role="listbox" aria-label={props.label}>
      {props.options.map((opt) => (
        <button
          key={String(opt)}
          type="button"
          role="option"
          aria-selected={opt === props.selected}
          className={`time-opt${opt === props.selected ? ' is-selected' : ''}`}
          onClick={() => props.onPick(opt)}
        >
          {props.format(opt)}
        </button>
      ))}
    </div>
  );
}

function toParts(value: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  const [h, m] = value.split(':').map(Number);
  return { hour12: h % 12 === 0 ? 12 : h % 12, minute: m, period: h < 12 ? 'AM' : 'PM' };
}

function fromParts({ hour12, minute, period }: { hour12: number; minute: number; period: 'AM' | 'PM' }): string {
  const h = (hour12 % 12) + (period === 'PM' ? 12 : 0);
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

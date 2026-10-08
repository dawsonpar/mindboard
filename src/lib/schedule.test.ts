import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSchedule, toEventTimes, fromEventTimes, eventIdFor, effectiveSchedule } from './schedule.ts';

const TZ = 'Europe/Paris';

test('parses an all-day date', () => {
  assert.deepEqual(parseSchedule('2026-10-20'), { date: '2026-10-20', start: null, end: null });
});

test('parses a start time without an end', () => {
  assert.deepEqual(parseSchedule('2026-10-20 9:30'), { date: '2026-10-20', start: '09:30', end: null });
});

test('parses a time range', () => {
  assert.deepEqual(parseSchedule(' 2026-10-20 14:00-15:30 '), { date: '2026-10-20', start: '14:00', end: '15:30' });
});

test('rejects an impossible date', () => {
  assert.equal(parseSchedule('2026-02-30'), null);
});

test('rejects an end before the start', () => {
  assert.equal(parseSchedule('2026-10-20 15:00-14:00'), null);
});

test('rejects free text', () => {
  assert.equal(parseSchedule('next tuesday'), null);
});

test('all-day schedule maps to an exclusive next-day end', () => {
  assert.deepEqual(toEventTimes(parseSchedule('2026-12-31')!, TZ), {
    start: { date: '2026-12-31' },
    end: { date: '2027-01-01' },
  });
});

test('start-only schedule defaults to a one hour event', () => {
  assert.deepEqual(toEventTimes(parseSchedule('2026-10-20 23:30')!, TZ), {
    start: { dateTime: '2026-10-20T23:30:00', timeZone: TZ },
    end: { dateTime: '2026-10-21T00:30:00', timeZone: TZ },
  });
});

test('timed event converts back to the local time range', () => {
  const times = { start: { dateTime: '2026-10-20T12:00:00Z' }, end: { dateTime: '2026-10-20T13:15:00Z' } };
  assert.equal(fromEventTimes(times, TZ), '2026-10-20 14:00-15:15');
});

test('all-day event converts back to its start date', () => {
  const times = { start: { date: '2026-10-20' }, end: { date: '2026-10-23' } };
  assert.equal(fromEventTimes(times, TZ), '2026-10-20');
});

test('event id is stable and valid base32hex', () => {
  const id = eventIdFor('personal', 'card.md');
  assert.equal(id, eventIdFor('personal', 'card.md'));
  assert.match(id, /^[0-9a-v]{5,1024}$/);
  assert.notEqual(id, eventIdFor('saved', 'card.md'));
});

test('rejects an end equal to the start', () => {
  assert.equal(parseSchedule('2026-10-20 14:00-14:00'), null);
});

test('rejects hour 24', () => {
  assert.equal(parseSchedule('2026-10-20 24:00'), null);
});

test('effective schedule fills in the default end', () => {
  assert.equal(effectiveSchedule('2026-10-20 14:00', TZ), '2026-10-20 14:00-15:00');
});

test('timed event crossing midnight collapses to its start', () => {
  const times = { start: { dateTime: '2026-10-20T21:30:00Z' }, end: { dateTime: '2026-10-20T22:30:00Z' } };
  assert.equal(fromEventTimes(times, TZ), '2026-10-20 23:30');
});

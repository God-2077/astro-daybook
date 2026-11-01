import assert from 'node:assert/strict';
import test from 'node:test';

import { localeMeta } from '../../src/i18n/current';
import { formatContentDate, formatDisplayDate, parseContentDate } from '../../src/lib/content/date';

const displayDate = (date: Date, timeZone: string) => formatContentDate(date, timeZone, localeMeta.datePatterns.display);

test('naive date is parsed in the configured timezone', () => {
  const shanghai = parseContentDate('2026-10-23 09:12:00', 'Asia/Shanghai', 'test.md', 'date');
  const newYork = parseContentDate('2026-10-23 09:12:00', 'America/New_York', 'test.md', 'date');

  assert.equal(shanghai.toISOString(), '2026-10-23T01:12:00.000Z');
  assert.equal(newYork.toISOString(), '2026-10-23T13:12:00.000Z');
  assert.equal(formatDisplayDate(shanghai, 'Asia/Shanghai'), displayDate(shanghai, 'Asia/Shanghai'));
  assert.equal(formatDisplayDate(newYork, 'America/New_York'), displayDate(newYork, 'America/New_York'));
});

test('date-only values keep the calendar day in the configured timezone', () => {
  const date = parseContentDate('2026-10-12', 'Asia/Shanghai', 'test.md', 'date');
  assert.equal(date.toISOString(), '2026-10-11T16:00:00.000Z');
  assert.equal(formatDisplayDate(date, 'Asia/Shanghai'), displayDate(date, 'Asia/Shanghai'));
  assert.equal(formatDisplayDate(date, 'America/New_York'), displayDate(date, 'America/New_York'));
});

test('ISO values with an offset are absolute instants', () => {
  const date = parseContentDate('2026-10-20T23:30:00+08:00', 'Asia/Shanghai', 'test.md', 'date');
  assert.equal(date.toISOString(), '2026-10-20T15:30:00.000Z');
  assert.equal(formatDisplayDate(date, 'Asia/Shanghai'), displayDate(date, 'Asia/Shanghai'));
  assert.equal(formatContentDate(date, 'Asia/Shanghai', 'yyyy-MM-dd HH:mm'), '2026-10-20 23:30');
});

test('invalid calendar values throw a readable content error', () => {
  assert.throws(() => parseContentDate('2026-02-30', 'Asia/Shanghai', 'bad.md', 'date'), /日期|格式不支持/);
  assert.throws(() => parseContentDate('not-a-date', 'Asia/Shanghai', 'bad.md', 'date'), /日期|格式不支持/);
});

import { isValid } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

import { localeMeta } from '../../i18n/current';
import { ContentError } from '../errors';

const NAIVE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
const OFFSET_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,9}))?(Z|[+-]\d{2}:?\d{2})$/;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function invalid(file: string, field: string, value: unknown, reason: string): never {
  throw new ContentError(file, `${field} 的值 ${JSON.stringify(value)} ${reason}`);
}

/**
 * 按站点时区解析内容日期。
 *
 * 支持：
 * - `YYYY-MM-DD`（视为该时区当天 00:00:00）
 * - `YYYY-MM-DD HH:mm:ss`
 * - 带偏移量的 ISO 8601（`Z` 或 `+08:00`）
 *
 * 不带时区的值使用 `timeZone` 解释，带偏移量时保留其绝对时刻。
 */
export function parseContentDate(value: unknown, timeZone: string, file: string, field: string): Date {
  if (value instanceof Date) {
    if (!isValid(value)) invalid(file, field, value, '不是有效日期');
    return value;
  }
  if (typeof value !== 'string') {
    invalid(file, field, value, '必须是日期字符串');
  }

  const raw = value.trim();
  if (raw.length === 0) invalid(file, field, value, '不能为空');

  const naive = NAIVE_RE.exec(raw);
  if (naive) {
    const [, yearText, monthText, dayText, hourText = '00', minuteText = '00', secondText = '00'] = naive;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);

    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month) || hour > 23 || minute > 59 || second > 59) {
      invalid(file, field, value, '不是有效日期');
    }

    const local = `${yearText}-${monthText}-${dayText}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
    const date = fromZonedTime(local, timeZone);
    if (!isValid(date)) invalid(file, field, value, `无法按 ${timeZone} 解析`);
    return date;
  }

  const offset = OFFSET_RE.exec(raw);
  if (offset) {
    const normalized = raw.replace(' ', 'T');
    const date = new Date(normalized);
    if (!isValid(date)) invalid(file, field, value, '不是有效日期');
    return date;
  }

  invalid(file, field, value, '格式不支持（应为 YYYY-MM-DD、YYYY-MM-DD HH:mm:ss 或带偏移量的 ISO 8601）');
}

export function formatContentDate(date: Date, timeZone: string, pattern: string): string {
  return formatInTimeZone(date, timeZone, pattern);
}

export interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

export function zonedParts(date: Date, timeZone: string): ZonedDateParts {
  const local = toZonedTime(date, timeZone);
  return {
    year: local.getFullYear(),
    month: local.getMonth() + 1,
    day: local.getDate(),
    hour: local.getHours(),
    minute: local.getMinutes(),
    second: local.getSeconds(),
    weekday: local.getDay(),
  };
}

export function weekdayLabel(weekday: number): string {
  return localeMeta.weekdays[weekday] ?? '';
}

export function formatDisplayDate(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, localeMeta.datePatterns.display);
}

export function formatDisplayDateTime(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, localeMeta.datePatterns.dateTime);
}

export function formatMonthDay(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, localeMeta.datePatterns.monthDay);
}

export function formatMonth(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, localeMeta.datePatterns.month);
}

/** 2026 · 十月 */
export function monthLabel(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  return localeMeta.monthLabel(parts.year, localeMeta.months[parts.month - 1] ?? '');
}

/** 2026 年 10 月 */
export function monthTitle(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  return localeMeta.monthTitle(parts.year, parts.month, localeMeta.months[parts.month - 1] ?? '');
}

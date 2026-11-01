export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function currentYearInTimeZone(timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const parsed = Number(year);
  if (!Number.isInteger(parsed)) {
    throw new Error(`无法解析时区 ${timeZone} 的当前年份`);
  }
  return parsed;
}

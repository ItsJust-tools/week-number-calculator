export type Mode = 'lookup' | 'reverse' | 'overview';

export interface HistoryEntry {
  /** Short human readable description of the saved calculation. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Active mode. */
  mode: Mode;
  /** Selected date as YYYY-MM-DD (lookup / overview anchor). */
  date: string;
  /** Week number for reverse lookup (1-53). */
  week: string;
  /** Year for reverse lookup / overview. */
  year: string;
  /** Saved week info history, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  mode: 'lookup',
  date: '2026-11-24',
  week: '1',
  year: '2026',
  history: [],
};

export const MAX_HISTORY = 20;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/** Parse an ISO date string (YYYY-MM-DD); returns null when invalid. */
export function parseIsoDate(input: string): Date | null {
  if (!isoDatePattern.test(input.trim())) return null;
  const [y, m, d] = input.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

/** Format a Date as YYYY-MM-DD (UTC). */
export function toIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format a date for display, e.g. "Mon 24 Nov 2026". */
export function formatDate(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${days[date.getUTCDay()]} ${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * ISO week number and ISO week-numbering year for a date.
 * ISO-8601: weeks start on Monday; week 1 is the week containing the first
 * Thursday of the year. Uses the standard Thursday rule.
 */
export function isoWeek(date: Date): { week: number; year: number } {
  const t = new Date(date.getTime());
  // ISO day: Mon=1..Sun=7
  const day = t.getUTCDay() === 0 ? 7 : t.getUTCDay();
  t.setUTCDate(t.getUTCDate() + 4 - day); // shift to the week's Thursday
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86400000 + 1) / 7);
  return { week, year: t.getUTCFullYear() };
}

/** Number of ISO weeks in a year (52, or 53 for long years like 2026). */
export function isoWeeksInYear(year: number): number {
  const { week } = isoWeek(new Date(Date.UTC(year, 11, 28)));
  return week;
}

/** Monday that starts ISO week 1 of the given ISO week-numbering year. */
export function week1Monday(year: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay();
  const monday = new Date(jan4.getTime());
  monday.setUTCDate(jan4.getUTCDate() - (day - 1));
  return monday;
}

/**
 * The 7 dates (Monday..Sunday) of a given ISO week number in a year.
 * Returns null when the week number exceeds the year's week count.
 */
export function weekDates(week: number, year: number): Date[] | null {
  if (!Number.isInteger(week) || week < 1 || week > isoWeeksInYear(year)) return null;
  const monday = week1Monday(year);
  monday.setUTCDate(monday.getUTCDate() + (week - 1) * 7);
  const days: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday.getTime());
    d.setUTCDate(monday.getUTCDate() + i);
    days.push(d);
  }
  return days;
}

/** All ISO weeks of a year with their Monday-start dates, or null on bad year. */
export function yearOverview(year: number): Array<{ week: number; start: Date; end: Date }> | null {
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  const weeks = isoWeeksInYear(year);
  const list: Array<{ week: number; start: Date; end: Date }> = [];
  for (let w = 1; w <= weeks; w += 1) {
    const days = weekDates(w, year);
    if (!days) return null;
    list.push({ week: w, start: days[0] as Date, end: days[6] as Date });
  }
  return list;
}

/** Parse an integer in a safe range; returns null when invalid. */
export function parseIntSafe(input: string, min: number, max: number): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

/** Result text for the current lookup mode, or null when inputs are invalid. */
export function resultText(state: ToolState): string | null {
  if (state.mode === 'lookup') {
    const date = parseIsoDate(state.date);
    if (!date) return null;
    const { week, year } = isoWeek(date);
    const days = weekDates(week, year);
    if (!days) return null;
    return `Week ${week} of ${year}: ${formatDate(days[0] as Date)} – ${formatDate(days[6] as Date)}`;
  }
  const week = parseIntSafe(state.week, 1, 99);
  const year = parseIntSafe(state.year, 1, 9999);
  if (week === null || year === null) return null;
  const days = weekDates(week, year);
  if (!days) return `Week ${week} does not exist in ${year} (${isoWeeksInYear(year)} weeks)`;
  return `Week ${week} of ${year}: ${formatDate(days[0] as Date)} – ${formatDate(days[6] as Date)}`;
}

/** Compact summary used by the status bar and copy actions. */
export function summaryText(state: ToolState): string {
  const result = resultText(state);
  if (result !== null) return result;
  return state.mode === 'lookup'
    ? 'Enter a valid date (YYYY-MM-DD)'
    : 'Enter a valid week (1-53) and year';
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    (v.mode === 'lookup' || v.mode === 'reverse' || v.mode === 'overview') &&
    typeof v.date === 'string' &&
    typeof v.week === 'string' &&
    typeof v.year === 'string'
  );
}

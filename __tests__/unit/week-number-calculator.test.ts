import { describe, it, expect } from 'vitest';
import {
  parseIsoDate,
  toIsoDate,
  formatDate,
  isoWeek,
  isoWeeksInYear,
  week1Monday,
  weekDates,
  yearOverview,
  parseIntSafe,
  resultText,
  summaryText,
  isState,
  DEFAULT_STATE,
  MAX_HISTORY,
  type ToolState,
} from '@/tool/types';
import {
  serializeState,
  deserializeState,
  fromUrlParams,
  withHistory,
  roundTrips,
  weekNumberCalculatorTool,
} from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('parseIsoDate', () => {
  it('parses valid dates and rejects invalid ones', () => {
    expect(parseIsoDate('2026-11-24')?.getTime()).toBe(Date.UTC(2026, 10, 24));
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('2026-00-10')).toBeNull();
    expect(parseIsoDate('abc')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate('2026-2-3')).toBeNull();
  });

  it('handles leap-year Feb 29', () => {
    expect(parseIsoDate('2028-02-29')).not.toBeNull();
    expect(parseIsoDate('2027-02-29')).toBeNull();
  });
});

describe('isoWeek (Thursday rule)', () => {
  it('computes the week number for a mid-year date', () => {
    expect(isoWeek(parseIsoDate('2026-06-15') as Date)).toEqual({ week: 25, year: 2026 });
    expect(isoWeek(parseIsoDate('2026-11-24') as Date)).toEqual({ week: 48, year: 2026 });
  });

  it('places Jan 1 correctly by the Thursday rule', () => {
    // 2026-01-01 is a Thursday -> week 1 of 2026.
    expect(isoWeek(parseIsoDate('2026-01-01') as Date)).toEqual({ week: 1, year: 2026 });
    // 2027-01-01 is a Friday -> week 53 of 2026.
    expect(isoWeek(parseIsoDate('2027-01-01') as Date)).toEqual({ week: 53, year: 2026 });
    // 2021-01-01 is a Friday -> week 53 of 2020.
    expect(isoWeek(parseIsoDate('2021-01-01') as Date)).toEqual({ week: 53, year: 2020 });
  });

  it('maps Dec 29-31 into week 1 of the next ISO year when applicable', () => {
    expect(isoWeek(parseIsoDate('2019-12-30') as Date)).toEqual({ week: 1, year: 2020 });
    expect(isoWeek(parseIsoDate('2026-12-31') as Date)).toEqual({ week: 53, year: 2026 });
  });

  it('identifies 53-week years correctly', () => {
    expect(isoWeeksInYear(2026)).toBe(53);
    expect(isoWeeksInYear(2020)).toBe(53);
    expect(isoWeeksInYear(2027)).toBe(52);
    expect(isoWeeksInYear(2015)).toBe(53);
    expect(isoWeeksInYear(2019)).toBe(52);
  });
});

describe('week1Monday and weekDates', () => {
  it('week 1 starts on the correct Monday', () => {
    expect(toIsoDate(week1Monday(2026))).toBe('2025-12-29');
    expect(toIsoDate(week1Monday(2025))).toBe('2024-12-30');
    expect(toIsoDate(week1Monday(2021))).toBe('2021-01-04');
  });

  it('reverse lookup lists all 7 dates Monday..Sunday', () => {
    const days = weekDates(1, 2026) as Date[];
    expect(days).toHaveLength(7);
    expect(toIsoDate(days[0] as Date)).toBe('2025-12-29');
    expect(days[0]?.getUTCDay()).toBe(1); // Monday
    expect(days[6]?.getUTCDay()).toBe(0); // Sunday
    expect(toIsoDate(days[6] as Date)).toBe('2026-01-04');
  });

  it('returns null for weeks beyond the year count', () => {
    expect(weekDates(53, 2027)).toBeNull();
    expect(weekDates(53, 2026)).not.toBeNull();
    expect(weekDates(0, 2026)).toBeNull();
    expect(weekDates(-1, 2026)).toBeNull();
  });

  it('week 53 of a long year spans into the next calendar year', () => {
    const days = weekDates(53, 2026) as Date[];
    expect(toIsoDate(days[0] as Date)).toBe('2026-12-28');
    expect(toIsoDate(days[6] as Date)).toBe('2027-01-03');
  });
});

describe('yearOverview', () => {
  it('produces every week with Monday start and Sunday end', () => {
    const weeks = yearOverview(2026) as Array<{ week: number; start: Date; end: Date }>;
    expect(weeks).toHaveLength(53);
    expect(weeks[0]?.week).toBe(1);
    expect(toIsoDate(weeks[0]?.start as Date)).toBe('2025-12-29');
    expect(weeks[52]?.week).toBe(53);
    expect(toIsoDate(weeks[52]?.end as Date)).toBe('2027-01-03');
    expect(weeks.every((w) => w.start.getUTCDay() === 1 && w.end.getUTCDay() === 0)).toBe(true);
  });

  it('returns null for invalid years', () => {
    expect(yearOverview(0)).toBeNull();
    expect(yearOverview(10000)).toBeNull();
  });
});

describe('helpers', () => {
  it('parseIntSafe validates ranges', () => {
    expect(parseIntSafe('42', 1, 53)).toBe(42);
    expect(parseIntSafe('54', 1, 53)).toBeNull();
    expect(parseIntSafe('0', 1, 53)).toBeNull();
    expect(parseIntSafe('abc', 1, 53)).toBeNull();
    expect(parseIntSafe('1.5', 1, 53)).toBeNull();
    expect(parseIntSafe('', 1, 53)).toBeNull();
  });

  it('formats dates for display', () => {
    expect(formatDate(parseIsoDate('2026-11-24') as Date)).toBe('Tue 24 Nov 2026');
    expect(toIsoDate(parseIsoDate('2026-01-05') as Date)).toBe('2026-01-05');
  });

  it('isState validates shape', () => {
    expect(isState({ ...DEFAULT_STATE })).toBe(true);
    expect(isState({ mode: 'nope', date: '', week: '', year: '' })).toBe(false);
    expect(isState(null)).toBe(false);
    expect(isState('x')).toBe(false);
  });
});

describe('resultText and summaryText', () => {
  it('lookup mode summarizes a valid date', () => {
    expect(resultText(state({ date: '2026-11-24' }))).toBe(
      'Week 48 of 2026: Mon 23 Nov 2026 – Sun 29 Nov 2026'
    );
  });

  it('lookup boundary dates report week year, not calendar year', () => {
    expect(resultText(state({ date: '2021-01-01' }))).toContain('Week 53 of 2020');
  });

  it('reverse mode summarizes a valid week', () => {
    expect(resultText(state({ mode: 'reverse', week: '1', year: '2026' }))).toContain(
      'Week 1 of 2026'
    );
  });

  it('returns null and guidance for invalid input', () => {
    expect(resultText(state({ date: 'bad' }))).toBeNull();
    expect(summaryText(state({ date: 'bad' }))).toBe('Enter a valid date (YYYY-MM-DD)');
    expect(resultText(state({ mode: 'reverse', week: '54', year: '2027' }))).toBe(
      'Week 54 does not exist in 2027 (52 weeks)'
    );
    expect(summaryText(state({ mode: 'reverse', week: 'x', year: '2027' }))).toBe(
      'Enter a valid week (1-53) and year'
    );
  });
});

describe('URL state serialization', () => {
  it('round-trips state through serialize/deserialize', () => {
    const s = state({ mode: 'reverse', date: '2020-02-29', week: '7', year: '1999' });
    const restored = deserializeState(serializeState(s));
    expect(restored.success).toBe(true);
    expect(restored.success && restored.data).toEqual(s);
    expect(roundTrips(s)).toBe(true);
  });

  it('round-trips through URL params', () => {
    const s = state({ mode: 'overview', week: '3', year: '2031' });
    const serialized = serializeState(s);
    const restored = fromUrlParams(serialized);
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.mode).toBe('overview');
      expect(restored.data.week).toBe('3');
      expect(restored.data.year).toBe('2031');
    }
  });

  it('includes history in serialized output and restores it', () => {
    const withEntry = withHistory(state(), 'Week 48 of 2026');
    const restored = deserializeState(serializeState(withEntry));
    expect(restored.success && restored.data.history).toHaveLength(1);
  });

  it('recovers gracefully from bad payloads', () => {
    const bad = deserializeState('nope');
    expect(bad.success).toBe(false);
    const repaired = deserializeState({ mode: 'bogus' });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.mode).toBe(DEFAULT_STATE.mode);
      expect(repaired.data.history).toEqual([]);
    }
    const junkHistory = deserializeState({ history: [{ nope: 1 }, 'x', null] });
    expect(junkHistory.success).toBe(true);
    if (junkHistory.success) expect(junkHistory.data.history).toEqual([]);
  });
});

describe('withHistory', () => {
  it('prepends entries and caps at MAX_HISTORY', () => {
    let s = state();
    for (let i = 0; i < MAX_HISTORY + 5; i += 1) {
      s = withHistory(s, `entry ${i}`, new Date(Date.UTC(2026, 0, 1)));
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]?.text).toBe(`entry ${MAX_HISTORY + 4}`);
  });
});

describe('tool definition wiring', () => {
  it('exposes config, exporters and default state', async () => {
    expect(weekNumberCalculatorTool.id).toBe('week-number-calculator');
    expect(weekNumberCalculatorTool.name).toBe('Week Number Calculator');
    expect(weekNumberCalculatorTool.initialState).toEqual(DEFAULT_STATE);
    expect(weekNumberCalculatorTool.serialize(DEFAULT_STATE)).toContain('mode=lookup');
    const exporters =
      (weekNumberCalculatorTool as { exporters?: Array<{ loader: () => Promise<unknown> }> })
        .exporters ?? [];
    expect(exporters).toHaveLength(4);
    const png = (await exporters[0]?.loader()) as { default: { format: string } };
    expect((png.default ?? png).format).toBe('png');
  });
});

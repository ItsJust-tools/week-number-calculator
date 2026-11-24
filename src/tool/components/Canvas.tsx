'use client';

import React from 'react';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  formatDate,
  isoWeek,
  isoWeeksInYear,
  parseIsoDate,
  resultText,
  summaryText,
  week1Monday,
  weekDates,
  yearOverview,
  toIsoDate,
  parseIntSafe,
  type Mode,
  type ToolState,
} from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

const MODE_TABS: { value: Mode; label: string }[] = [
  { value: 'lookup', label: 'Week of a date' },
  { value: 'reverse', label: 'Dates of a week' },
  { value: 'overview', label: 'Year overview' },
];

function addDays(state: ToolState, delta: number): ToolState {
  const date = parseIsoDate(state.date) ?? parseIsoDate(DEFAULT_STATE.date);
  if (!date) return state;
  date.setUTCDate(date.getUTCDate() + delta);
  return { ...state, date: toIsoDate(date) };
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const change = (next: ToolState) => onChange?.(next);
  const result = resultText(state);

  const saveWeekInfo = () => {
    const text = summaryText(state);
    if (resultText(state) !== null) onSaveHistory?.(text);
  };

  return (
    <div className="space-y-6 p-4" data-testid="week-canvas">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Mode">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            data-testid={`mode-tab-${tab.value}`}
            onClick={() => change({ ...state, mode: tab.value })}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              state.mode === tab.value
                ? 'bg-violet-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {state.mode === 'lookup' ? (
        <section data-testid="lookup-section">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Date (YYYY-MM-DD)
            <input
              type="date"
              value={state.date}
              onChange={(e) => change({ ...state, date: e.target.value })}
              data-testid="input-date"
              className={inputClass}
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="btn-prev-day"
              onClick={() => change(addDays(state, -1))}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            >
              ← Day
            </button>
            <button
              type="button"
              data-testid="btn-next-day"
              onClick={() => change(addDays(state, 1))}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            >
              Day →
            </button>
            <button
              type="button"
              data-testid="btn-prev-week"
              onClick={() => change(addDays(state, -7))}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            >
              ← Week
            </button>
            <button
              type="button"
              data-testid="btn-next-week"
              onClick={() => change(addDays(state, 7))}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            >
              Week →
            </button>
          </div>
          <div
            data-testid="result-card"
            className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Result
            </p>
            <p
              data-testid="result-main"
              className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              {result ?? 'Enter a valid date (YYYY-MM-DD)'}
            </p>
            {result ? (
              <button
                type="button"
                data-testid="btn-save-history"
                onClick={saveWeekInfo}
                className="mt-2 rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              >
                Save to history
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {state.mode === 'reverse' ? (
        <section data-testid="reverse-section">
          <div className="flex flex-wrap gap-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Week (1-53)
              <input
                type="number"
                min={1}
                max={53}
                value={state.week}
                onChange={(e) => change({ ...state, week: e.target.value })}
                data-testid="input-week"
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Year
              <input
                type="number"
                min={1}
                max={9999}
                value={state.year}
                onChange={(e) => change({ ...state, year: e.target.value })}
                data-testid="input-year"
                className={inputClass}
              />
            </label>
          </div>
          <div data-testid="result-card" className="mt-4 space-y-2">
            <p
              data-testid="result-main"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              {result ?? 'Enter a valid week and year'}
            </p>
            {(() => {
              const week = parseIntSafe(state.week, 1, 53);
              const year = parseIntSafe(state.year, 1, 9999);
              const days = week !== null && year !== null ? weekDates(week, year) : null;
              if (!days) return null;
              return (
                <ul
                  className="space-y-1 text-sm text-gray-700 dark:text-gray-300"
                  data-testid="week-day-list"
                >
                  {days.map((d) => (
                    <li key={toIsoDate(d)}>
                      <span className="font-mono">{toIsoDate(d)}</span> — {formatDate(d)}
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
        </section>
      ) : null}

      {state.mode === 'overview' ? (
        <section data-testid="overview-section">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Year
            <input
              type="number"
              min={1}
              max={9999}
              value={state.year}
              onChange={(e) => change({ ...state, year: e.target.value })}
              data-testid="input-year-overview"
              className={inputClass}
            />
          </label>
          {(() => {
            const year = parseIntSafe(state.year, 1, 9999);
            const weeks = year !== null ? yearOverview(year) : null;
            if (!weeks) {
              return (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Enter a valid year</p>
              );
            }
            return (
              <div className="mt-3">
                <p
                  className="text-sm text-gray-600 dark:text-gray-400"
                  data-testid="overview-count"
                >
                  {year} has {weeks.length} ISO weeks
                </p>
                <ul
                  className="mt-2 max-h-96 space-y-1 overflow-y-auto text-sm text-gray-700 dark:text-gray-300"
                  data-testid="overview-list"
                >
                  {weeks.map((w) => (
                    <li
                      key={w.week}
                      className="flex justify-between gap-3 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <button
                        type="button"
                        onClick={() => change({ ...state, mode: 'reverse', week: String(w.week) })}
                        className="font-mono font-semibold text-violet-600 hover:underline dark:text-violet-400"
                      >
                        W{String(w.week).padStart(2, '0')}
                      </button>
                      <span>
                        {toIsoDate(w.start)} – {toIsoDate(w.end)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </section>
      ) : null}

      {state.history.length > 0 ? (
        <section data-testid="history-section">
          <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">History</h3>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {state.history.slice(0, MAX_HISTORY).map((entry) => (
              <li key={entry.createdAt} className="rounded bg-gray-50 px-2 py-1 dark:bg-gray-800">
                {entry.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

// Re-export helper for tests and future use.
export { isoWeek, isoWeeksInYear, week1Monday };

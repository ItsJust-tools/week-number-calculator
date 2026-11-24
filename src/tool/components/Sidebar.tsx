'use client';

import React from 'react';
import { isoWeeksInYear, parseIntSafe, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const year = parseIntSafe(state.year, 1, 9999);
  const weeks = year !== null ? isoWeeksInYear(year) : null;
  return (
    <div className="h-full space-y-6 overflow-y-auto p-4 text-sm" data-testid="week-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Modes</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <strong>Week of a date</strong> — ISO week number for a picked date
          </li>
          <li>
            <strong>Dates of a week</strong> — all 7 dates of a week number
          </li>
          <li>
            <strong>Year overview</strong> — every week with its date range
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">ISO-8601 notes</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>Weeks start on Monday.</li>
          <li>Week 1 contains the first Thursday of the year.</li>
          <li>Early January dates can belong to the previous year&rsquo;s last week.</li>
          <li>Dec 29–31 can belong to week 1 of the next year.</li>
          {weeks !== null ? (
            <li data-testid="sidebar-weeks-in-year">
              {year} has {weeks} ISO weeks.
            </li>
          ) : null}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved results</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current state; open it to
          restore the same view.
        </p>
      </div>
    </div>
  );
};

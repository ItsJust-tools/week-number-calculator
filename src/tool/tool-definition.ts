import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  resultText,
  summaryText,
  type HistoryEntry,
  type Mode,
  type ToolState,
} from './types';

const VALID_MODES: Mode[] = ['lookup', 'reverse', 'overview'];

/**
 * Serialize tool state into URL query parameters.
 * Round-trips via deserializeState(serializeState(state)).
 */
export function serializeState(state: ToolState): string {
  const params = new URLSearchParams();
  params.set('mode', state.mode);
  params.set('date', state.date);
  params.set('week', state.week);
  params.set('year', state.year);
  if (state.history.length > 0) {
    params.set('history', JSON.stringify(state.history));
  }
  return params.toString();
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Validate and recover tool state from a serialized payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data === 'string') {
    if (!data.includes('=')) {
      return {
        success: false,
        error: 'Invalid data format: expected week number calculator state object',
      };
    }
    try {
      const params = new URLSearchParams(data);
      return deserializeState({
        mode: params.get('mode') ?? DEFAULT_STATE.mode,
        date: params.get('date') ?? DEFAULT_STATE.date,
        week: params.get('week') ?? DEFAULT_STATE.week,
        year: params.get('year') ?? DEFAULT_STATE.year,
        history: params.get('history') ? JSON.parse(params.get('history') as string) : [],
      });
    } catch {
      return {
        success: false,
        error: 'Invalid data format: expected week number calculator state object',
      };
    }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected week number calculator state object',
    };
  }
  if (typeof (data as Record<string, unknown>).query === 'string') {
    return deserializeState((data as Record<string, string>).query);
  }
  const v = data as Record<string, unknown>;
  const mode: Mode = VALID_MODES.includes(v.mode as Mode) ? (v.mode as Mode) : DEFAULT_STATE.mode;
  const state: ToolState = {
    mode,
    date: stringOr(v.date, DEFAULT_STATE.date),
    week: stringOr(v.week, DEFAULT_STATE.week),
    year: stringOr(v.year, DEFAULT_STATE.year),
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Convert a serialized URL parameter string into state (success only when valid). */
export function fromUrlParams(query: string): DeserializeResult<ToolState> {
  return deserializeState({ query });
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(JSON.stringify(serializedToObject(state))));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

/** URLSearchParams-compatible plain object for serialize output. */
function serializedToObject(state: ToolState): Record<string, string> {
  const params = new URLSearchParams(serializeState(state));
  const obj: Record<string, string> = {};
  params.forEach((value, key) => {
    obj[key] = value;
  });
  if (obj.history) obj.history = JSON.parse(obj.history) as unknown as string;
  return obj;
}

export const weekNumberCalculatorTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export { resultText, summaryText };

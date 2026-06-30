import {createHistoryEvent} from '@/lib/history/events';
import type {CreateHistoryEventInput} from '@/lib/history/events';
import type {HistoryEvent} from '@/types/history';

const STORAGE_KEY = 'kayeon_history_v1';

export function loadHistoryEvents() {
  if (typeof window === 'undefined') {
    return [] as HistoryEvent[];
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return [] as HistoryEvent[];
  }

  try {
    return JSON.parse(stored) as HistoryEvent[];
  } catch {
    return [] as HistoryEvent[];
  }
}

export function saveHistoryEvents(events: HistoryEvent[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function recordHistoryEvent(input: CreateHistoryEventInput) {
  const events = loadHistoryEvents();
  saveHistoryEvents([createHistoryEvent(input), ...events]);
}

import {describe, expect, it} from 'vitest';

import type {PatchNote} from './data';
import {hasUnseenPatchNotes, latestPatchDate} from './unseen';

const notes: PatchNote[] = [
  {date: '2026-07-08', title: 'b', details: []},
  {date: '2026-07-01', title: 'a', details: []},
];

describe('latestPatchDate', () => {
  it('returns the newest date regardless of array order', () => {
    expect(latestPatchDate(notes)).toBe('2026-07-08');
    expect(latestPatchDate([...notes].reverse())).toBe('2026-07-08');
  });

  it('returns null for an empty list', () => {
    expect(latestPatchDate([])).toBeNull();
  });
});

describe('hasUnseenPatchNotes', () => {
  it('is true when the last-seen date differs from the latest', () => {
    expect(hasUnseenPatchNotes(notes, '2026-07-01')).toBe(true);
  });

  it('is true on first visit (no last-seen date)', () => {
    expect(hasUnseenPatchNotes(notes, null)).toBe(true);
  });

  it('is false when the latest patch was already seen', () => {
    expect(hasUnseenPatchNotes(notes, '2026-07-08')).toBe(false);
  });

  it('is false when there are no patch notes', () => {
    expect(hasUnseenPatchNotes([], null)).toBe(false);
  });
});

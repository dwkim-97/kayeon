import {describe, expect, it} from 'vitest';

import {computeDroppedWeight} from './manual-order';
import type {Profile} from '@/types/profile';

const p = (id: string, w: number) => ({id, manualOrderWeight: w} as Profile);

describe('computeDroppedWeight', () => {
  const list = [p('a', 1), p('b', 2), p('c', 3)];

  it('midpoint when dropped between two neighbors', () => {
    // move 'c'(idx2) to idx1 → between a(1) and b(2) → 1.5
    expect(computeDroppedWeight(list, 2, 1)).toBe(1.5);
  });

  it('below-first when dropped to top', () => {
    // move 'c' to idx0 → above a(1) → 0
    expect(computeDroppedWeight(list, 2, 0)).toBe(0);
  });

  it('above-last when dropped to bottom', () => {
    // move 'a'(idx0) to idx2 → below c(3) → 4
    expect(computeDroppedWeight(list, 0, 2)).toBe(4);
  });
});

import {describe, expect, it} from 'vitest';

import {reorderWeights} from './manual-order';
import type {Profile} from '@/types/profile';

// 초기 상태: 모두 weight 0 (실제 버그 재현 조건)
const p = (id: string, w = 0) => ({id, manualOrderWeight: w} as Profile);

describe('reorderWeights', () => {
  it('assigns 0..n by new order and returns only changed rows (move middle, all zero)', () => {
    const list = [p('a'), p('b'), p('c'), p('d')]; // 전부 0
    // c(2)를 index 1로: 새 순서 a,c,b,d → 가중치 a0 c1 b2 d3
    const changed = reorderWeights(list, 2, 1);
    // a는 0 그대로(변경 없음), c→1, b→2, d→3
    const byId = Object.fromEntries(changed.map(r => [r.id, r.manualOrderWeight]));
    expect(byId).toEqual({c: 1, b: 2, d: 3});
    expect(changed.find(r => r.id === 'a')).toBeUndefined();
  });

  it('moves to top', () => {
    const list = [p('a'), p('b'), p('c')];
    const changed = reorderWeights(list, 2, 0); // c 맨 위: c,a,b → c0 a1 b2
    const byId = Object.fromEntries(changed.map(r => [r.id, r.manualOrderWeight]));
    expect(byId).toEqual({c: 0, a: 1, b: 2});
  });

  it('moves to bottom', () => {
    const list = [p('a'), p('b'), p('c')];
    const changed = reorderWeights(list, 0, 2); // a 맨 아래: b,c,a → b0 c1 a2
    const byId = Object.fromEntries(changed.map(r => [r.id, r.manualOrderWeight]));
    expect(byId).toEqual({b: 0, c: 1, a: 2});
  });

  it('returns empty when position is unchanged', () => {
    const list = [p('a', 0), p('b', 1), p('c', 2)];
    expect(reorderWeights(list, 1, 1)).toEqual([]);
  });
});

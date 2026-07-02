import {describe, expect, it} from 'vitest';

import {getAuthorColor} from './author-color';

describe('getAuthorColor', () => {
  it('returns the same color for the same name (deterministic)', () => {
    expect(getAuthorColor('에이든')).toEqual(getAuthorColor('에이든'));
    expect(getAuthorColor('조이')).toEqual(getAuthorColor('조이'));
  });

  it('trims whitespace so " 에이든 " matches "에이든"', () => {
    expect(getAuthorColor(' 에이든 ')).toEqual(getAuthorColor('에이든'));
  });

  it('returns a valid {bg, text} pair', () => {
    const color = getAuthorColor('에드');
    expect(color.bg).toMatch(/^#[0-9a-f]{6}$/i);
    expect(color.text).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('distributes Korean names across the palette (not all identical)', () => {
    // 한글 이름들은 charCode가 커서 하위 비트 편향이 생기기 쉽다 — 골고루 퍼져야 한다.
    const names = ['에이든', '에드', '조이', '민수', '홍길동', '김철수', '이영희', '박지성'];
    const bgs = new Set(names.map(n => getAuthorColor(n).bg));
    // 8개 한글 이름 → 최소 3가지 이상 색 (한 색으로 몰리면 실패)
    expect(bgs.size).toBeGreaterThanOrEqual(3);
  });

  it('falls back to a color for empty name', () => {
    expect(getAuthorColor('').bg).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

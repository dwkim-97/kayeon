import {describe, expect, it} from 'vitest';

import {AUTHOR_COLORS, getAuthorColor} from './author-color';

describe('AUTHOR_COLORS palette', () => {
  it('has enough distinct colors to tell matchmakers apart', () => {
    // 겹침을 줄이려면 팔레트가 넉넉해야 한다.
    expect(AUTHOR_COLORS.length).toBeGreaterThanOrEqual(10);
  });

  it('has no duplicate background colors', () => {
    const bgs = new Set(AUTHOR_COLORS.map(c => c.bg));
    expect(bgs.size).toBe(AUTHOR_COLORS.length);
  });

  it('has no duplicate text colors', () => {
    const texts = new Set(AUTHOR_COLORS.map(c => c.text));
    expect(texts.size).toBe(AUTHOR_COLORS.length);
  });

  it('every entry is a valid hex {bg, text} pair', () => {
    for (const {bg, text} of AUTHOR_COLORS) {
      expect(bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(text).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

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

  it('uses fixed colors for designated matchmakers (조이/에드/에이든)', () => {
    expect(getAuthorColor('조이')).toEqual({bg: '#fce7f3', text: '#9d174d'}); // 분홍
    expect(getAuthorColor('에드')).toEqual({bg: '#fef9c3', text: '#854d0e'}); // 노랑
    expect(getAuthorColor('에이든')).toEqual({bg: '#f3e8ff', text: '#6b21a8'}); // 보라
  });

  it('trims whitespace for fixed-color names too', () => {
    expect(getAuthorColor('  조이 ')).toEqual(getAuthorColor('조이'));
  });

  it('gives the three designated matchmakers three distinct colors', () => {
    const colors = ['조이', '에드', '에이든'].map(n => getAuthorColor(n).bg);
    expect(new Set(colors).size).toBe(3);
  });
});

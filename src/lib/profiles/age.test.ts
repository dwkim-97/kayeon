import {describe, expect, it} from 'vitest';

import {birthYearFromAge, formatBirthYearLabel} from './age';

describe('formatBirthYearLabel', () => {
  it('formats a birth year as a Korean birth-year label', () => {
    expect(formatBirthYearLabel(1998)).toBe('98년생');
    expect(formatBirthYearLabel(2001)).toBe('01년생');
  });

  it('converts legacy Korean age values to birth years', () => {
    expect(birthYearFromAge(29, 2026)).toBe(1998);
    expect(birthYearFromAge(33, 2026)).toBe(1994);
  });
});

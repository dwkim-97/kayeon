import {describe, expect, it} from 'vitest';

import {buildInternalAuthEmail, normalizeLoginId} from './internal-email';

describe('internal auth email mapping', () => {
  it('normalizes a display login id and maps it to an internal email', () => {
    expect(normalizeLoginId(' Aiden_97 ')).toBe('aiden_97');
    expect(buildInternalAuthEmail(' Aiden.97 ')).toBe('aiden.97@kayeon.internal');
  });

  it('rejects values that cannot be used as private login ids', () => {
    expect(() => normalizeLoginId('ai')).toThrow('아이디는 3~32자의 영문, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다.');
    expect(() => normalizeLoginId('aiden@example.com')).toThrow(
      '아이디는 3~32자의 영문, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다.',
    );
    expect(() => normalizeLoginId('aiden dw')).toThrow(
      '아이디는 3~32자의 영문, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다.',
    );
  });
});

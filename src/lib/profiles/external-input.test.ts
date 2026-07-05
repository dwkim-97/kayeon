import {describe, expect, it} from 'vitest';

import {parseExternalProfile} from './external-input';

describe('parseExternalProfile', () => {
  it('accepts a minimal valid payload and fills defaults', () => {
    const r = parseExternalProfile({gender: 'female', birthYear: 1996, height: 163, residence: '수지', job: '회사원'});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.value.religion).toBe('not_selected');
      expect(r.value.mbti).toBe('');
      expect(r.value.smoking).toBe('not_selected');
    }
  });

  it('rejects missing required field (job)', () => {
    const r = parseExternalProfile({gender: 'female', birthYear: 1996, height: 163, residence: '수지'});
    expect(r.success).toBe(false);
  });

  it('rejects invalid gender', () => {
    const r = parseExternalProfile({gender: 'x', birthYear: 1996, height: 163, residence: '수지', job: '회사원'});
    expect(r.success).toBe(false);
  });

  it('rejects out-of-range height and birthYear', () => {
    expect(parseExternalProfile({gender: 'male', birthYear: 1800, height: 170, residence: 'a', job: 'b'}).success).toBe(false);
    expect(parseExternalProfile({gender: 'male', birthYear: 1996, height: 40, residence: 'a', job: 'b'}).success).toBe(false);
  });
});

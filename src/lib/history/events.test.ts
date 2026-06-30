import {describe, expect, it} from 'vitest';

import {historyEventLabels} from './events';

describe('history events', () => {
  it('has a Korean label for every event type', () => {
    expect(historyEventLabels.profile_blocked).toBe('매물 차단');
    expect(historyEventLabels.admin_created).toBe('관리자 추가');
    expect(historyEventLabels.admin_removed).toBe('관리자 제거');
  });
});

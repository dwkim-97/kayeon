import {describe, expect, it} from 'vitest';

import {createHistoryEvent, historyEventLabels} from './events';

describe('history events', () => {
  it('creates a complete event record with a stable Korean label', () => {
    const event = createHistoryEvent({
      id: 'history-1',
      type: 'profile_blocked',
      actorName: 'Aiden',
      targetLabel: '여성 29세',
      description: '상태를 blocked로 변경',
      createdAt: '2026-06-30T00:00:00.000Z',
    });

    expect(event).toEqual({
      id: 'history-1',
      type: 'profile_blocked',
      actorName: 'Aiden',
      targetLabel: '여성 29세',
      description: '상태를 blocked로 변경',
      createdAt: '2026-06-30T00:00:00.000Z',
    });
    expect(historyEventLabels.profile_blocked).toBe('매물 차단');
  });
});

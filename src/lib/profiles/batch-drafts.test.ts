import {describe, expect, it} from 'vitest';

import {
  addProfileDraft,
  createProfileDraft,
  isProfileDraftStarted,
  removeProfileDraft,
  updateProfileDraft,
} from './batch-drafts';

describe('batch profile drafts', () => {
  it('keeps at most ten drafts', () => {
    const drafts = Array.from({length: 12}, (_, index) => `draft-${index}`).reduce(
      (current, id) => addProfileDraft(current, createProfileDraft(id)),
      [createProfileDraft('first')],
    );

    expect(drafts).toHaveLength(10);
  });

  it('updates only the selected draft', () => {
    const first = createProfileDraft('first');
    const second = createProfileDraft('second');
    const drafts = updateProfileDraft([first, second], first.id, {...first.values, residence: '서울 강남'});

    expect(drafts[0].values.residence).toBe('서울 강남');
    expect(drafts[1].values.residence).toBe('');
  });

  it('removes a draft but always keeps one form open', () => {
    const first = createProfileDraft('first');
    const second = createProfileDraft('second');

    expect(removeProfileDraft([first, second], first.id)).toEqual([second]);
    expect(removeProfileDraft([first], first.id)).toEqual([first]);
  });

  it('treats any changed field as started work', () => {
    const empty = createProfileDraft('empty');
    const memoOnly = createProfileDraft('memo');
    memoOnly.values.adminMemo = '연락 전 확인';

    expect(isProfileDraftStarted(empty)).toBe(false);
    expect(isProfileDraftStarted(memoOnly)).toBe(true);
  });
});

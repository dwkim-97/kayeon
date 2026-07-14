import {describe, expect, it} from 'vitest';

import {profileToUpdateRow, rowToProfile} from './mappers';
import type {Database} from './types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const baseRow: ProfileRow = {
  id: 'p1', gender: 'female', status: 'active', author_name: 'Aiden',
  residence: '서울', birth_year: 1998, height: 164, job: 'IT',
  religion: 'not_selected', mbti: '', hobbies: '', smoking: 'not_selected',
  drinking: 'not_selected', ideal_type: '', matchmaker_comment: '', extra: '',
  admin_memo: '', starred_by_name: null,
  created_at: '2026-06-30T00:00:00.000Z', updated_at: '2026-06-30T00:00:00.000Z',
};

describe('rowToProfile reward/manualOrderWeight', () => {
  it('reads reward and manual_order_weight', () => {
    const profile = rowToProfile({...baseRow, reward: '소개비 50만원', manual_order_weight: 3.5}, [], 'https://x');
    expect(profile.reward).toBe('소개비 50만원');
    expect(profile.manualOrderWeight).toBe(3.5);
  });

  it('defaults when columns are absent (unmigrated DB)', () => {
    const profile = rowToProfile(baseRow, [], 'https://x');
    expect(profile.reward).toBe('');
    expect(profile.manualOrderWeight).toBe(0);
  });
});

describe('profileToUpdateRow reward/manualOrderWeight', () => {
  it('maps camelCase to snake_case columns', () => {
    const row = profileToUpdateRow({reward: 'X', manualOrderWeight: 2});
    expect(row.reward).toBe('X');
    expect(row.manual_order_weight).toBe(2);
  });
});

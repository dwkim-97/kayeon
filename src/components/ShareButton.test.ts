import {describe, expect, it} from 'vitest';

import {getShareImageLayout, getShareProfileInformationRows, getShareProfileLabel} from './ShareButton';
import type {Profile} from '@/types/profile';

const profile: Profile = {
  id: 'profile-1',
  gender: 'female',
  status: 'active',
  isActivated: true,
  authorName: 'Aiden',
  residence: '서울 강남구',
  birthYear: 1998,
  height: 164,
  job: 'IBK / 을지로 / 금융',
  religion: 'none',
  mbti: 'ENFJ',
  hobbies: '독서',
  smoking: 'non_smoker',
  drinking: 'drinker',
  idealType: '다정한 사람',
  matchmakerComment: '성실함',
  extra: '',
  photos: [],
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
};

describe('share image helpers', () => {
  it('starts share cards without reserving a header area', () => {
    expect(getShareImageLayout(2)).toEqual({
      width: 1080,
      cardHeight: 700,
      gap: 34,
      padding: 56,
      height: 1546,
    });
  });

  it('uses dashboard-style profile information rows without author text', () => {
    expect(getShareProfileLabel(profile)).toBe('여성 98년생');
    expect(getShareProfileInformationRows(profile)).toEqual([
      ['나이', '98년생'],
      ['키', '164cm'],
      ['사는 곳', '서울 강남구'],
      ['회사', 'IBK / 을지로 / 금융'],
      ['종교', '무교'],
      ['MBTI', 'ENFJ'],
      ['취미', '독서'],
      ['흡연/음주', '비흡연 / 마심'],
      ['이상형', '다정한 사람'],
      ['코멘트', '성실함'],
    ]);
  });
});

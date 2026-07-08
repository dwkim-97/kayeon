import {describe, expect, it} from 'vitest';

import {
  getShareImageLayout,
  getShareProfileCardLayout,
  getShareProfileLabel,
  wrapTextByWidth,
} from './ShareButton';
import {getProfileInformationRows} from '@/lib/profiles/information';
import type {Profile} from '@/types/profile';

const profile: Profile = {
  id: 'profile-1',
  gender: 'female',
  status: 'active',
  isActivated: true,
  authorName: 'Aiden',
  starredByName: null,
  residence: '서울 강남구',
  birthYear: 1998,
  height: 164,
  job: 'IBK / 을지로 / 금융',
  religion: 'not_selected',
  mbti: 'ENFJ',
  hobbies: '독서',
  smoking: 'non_smoker',
  drinking: 'drinker',
  idealType: '다정한 사람',
  matchmakerComment: '성실함',
  extra: '',
  adminMemo: '',
  probe: 'not_selected',
  rejectionTolerance: 'not_selected',
  responseSpeed: 'not_selected',
  photos: [],
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
};

describe('share image helpers', () => {
  it('starts share cards without reserving a header area', () => {
    expect(getShareImageLayout(2)).toEqual({
      width: 1080,
      cardHeight: 760,
      gap: 34,
      padding: 56,
      height: 1666,
    });
  });

  it('uses a larger image area and a narrower information area', () => {
    expect(getShareProfileCardLayout(968)).toEqual({
      imageHeight: 640,
      imageInset: 28,
      imageWidth: 500,
      informationGap: 28,
      informationRightPadding: 28,
      informationWidth: 384,
    });
  });

  it('wraps long information values instead of clipping them', () => {
    const lines = wrapTextByWidth('다정한 사람과 대화가 잘 통하는 사람', 50, value => Array.from(value).length * 10);

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe('다정한 사람과 대화가 잘 통하는 사람');
    expect(lines.every(line => Array.from(line).length * 10 <= 50)).toBe(true);
  });

  it('uses dashboard-style profile information rows without author text', () => {
    expect(getShareProfileLabel(profile)).toBe('98년생');
    expect(getProfileInformationRows(profile)).toEqual([
      ['나이', '98년생'],
      ['키', '164cm'],
      ['사는 곳', '서울 강남구'],
      ['회사', 'IBK / 을지로 / 금융'],
      ['MBTI', 'ENFJ'],
      ['취미', '독서'],
      ['흡연/음주', '비흡연 / 마심'],
      ['이상형', '다정한 사람'],
      ['주선자 코멘트', '성실함'],
    ]);
  });
});

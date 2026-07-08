import {describe, expect, it} from 'vitest';

import {
  getAdditionalInformationRows,
  getAdminInformationRows,
  getPrimaryInformationRows,
  getProfileInformationRows,
} from './information';
import type {Profile} from '@/types/profile';

const profile: Profile = {
  id: 'p1',
  gender: 'female',
  status: 'active',
  isActivated: true,
  authorName: 'Aiden',
  starredByName: null,
  residence: '서울 강남구',
  birthYear: 1998,
  height: 164,
  job: 'IBK / 을지로',
  religion: 'christian',
  mbti: 'ENFJ',
  hobbies: '독서',
  smoking: 'non_smoker',
  drinking: 'drinker',
  idealType: '다정한 사람',
  matchmakerComment: '성실함',
  extra: '반려견',
  adminMemo: '',
  probe: 'not_selected',
  rejectionTolerance: 'not_selected',
  responseSpeed: 'not_selected',
  photos: [],
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
};

describe('profile information rows', () => {
  it('primary rows are exactly 나이/키/사는 곳/회사 in order', () => {
    const labels = getPrimaryInformationRows(profile).map(([label]) => label);
    expect(labels).toEqual(['나이', '키', '사는 곳', '회사']);
    expect(getPrimaryInformationRows(profile)).toEqual([
      ['나이', '98년생'],
      ['키', '164cm'],
      ['사는 곳', '서울 강남구'],
      ['회사', 'IBK / 을지로'],
    ]);
  });

  it('additional rows exclude the primary labels', () => {
    const labels = getAdditionalInformationRows(profile).map(([label]) => label);
    expect(labels).not.toContain('나이');
    expect(labels).not.toContain('회사');
    expect(labels).toContain('종교');
    expect(labels).toContain('MBTI');
  });

  it('additional rows omit empty / not_selected values', () => {
    const sparse: Profile = {
      ...profile,
      religion: 'not_selected',
      mbti: '',
      hobbies: '',
      smoking: 'not_selected',
      drinking: 'not_selected',
      idealType: '',
      matchmakerComment: '',
      extra: '',
    };
    expect(getAdditionalInformationRows(sparse)).toEqual([]);
  });

  it('full rows = primary followed by additional', () => {
    expect(getProfileInformationRows(profile)).toEqual([
      ...getPrimaryInformationRows(profile),
      ...getAdditionalInformationRows(profile),
    ]);
  });

  it('admin rows include set 떠보기/거절내성/응답속도 and omit not_selected', () => {
    const withAdmin: Profile = {
      ...profile,
      probe: 'possible',
      rejectionTolerance: 'high',
      responseSpeed: 'not_selected',
    };
    expect(getAdminInformationRows(withAdmin)).toEqual([
      ['떠보기', '떠보기 가능'],
      ['거절내성', '상'],
    ]);
  });

  it('admin rows are empty when all not_selected', () => {
    expect(getAdminInformationRows(profile)).toEqual([]);
  });
});

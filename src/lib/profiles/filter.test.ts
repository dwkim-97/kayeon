import {describe, expect, it} from 'vitest';

import {filterProfiles} from './filter';
import type {Profile} from '@/types/profile';

const baseProfile: Profile = {
  id: 'profile-1',
  gender: 'female',
  status: 'active',
  isActivated: true,
  authorName: 'Aiden',
  starredByName: null,
  residence: '서울 강남구',
  birthYear: 1998,
  height: 164,
  job: 'ibk / 을지로 / 금융',
  religion: 'not_selected',
  mbti: 'ENFJ',
  hobbies: '독서 운동',
  smoking: 'non_smoker',
  drinking: 'drinker',
  idealType: '다정한 사람',
  matchmakerComment: '성실하고 밝음',
  extra: '반려견 좋아함',
  photos: [
    {
      id: 'photo-1',
      url: '/sample-1.jpg',
      alt: '민서 사진 1',
      order: 0,
    },
  ],
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
};

const noFilter = {
  birthYearValue: '',
  birthYearComparison: 'gte' as const,
  heightValue: '',
  heightComparison: 'gte' as const,
  activeOnly: false,
  religion: '' as const,
  smoking: '' as const,
  query: '',
};

describe('filterProfiles', () => {
  it('combines gender, numeric filters, select filters, and value search', () => {
    const profiles: Profile[] = [
      baseProfile,
      {
        ...baseProfile,
        id: 'profile-2',
        gender: 'male',
        residence: '서울 마포구',
        birthYear: 1994,
        height: 178,
        religion: 'christian',
        smoking: 'smoker',
        mbti: 'ISTJ',
      },
    ];

    const result = filterProfiles(profiles, {
      gender: 'female',
      birthYearValue: '1997',
      birthYearComparison: 'gte', // 이하 — 1997 이하 출생연도 (더 어린 사람)
      heightValue: '170',
      heightComparison: 'lte',
      activeOnly: true,
      religion: 'not_selected',
      smoking: 'non_smoker',
      query: 'ibk enfj 강남',
    });

    expect(result.map(profile => profile.id)).toEqual(['profile-1']);
  });

  it('"이상(lte)" birth-year filter includes profiles born that year or earlier', () => {
    // 1997년생 이상 → birthYear <= 1997 → 1998은 제외, 1997/1996은 포함
    const result = filterProfiles([baseProfile], { // birthYear: 1998
      ...noFilter,
      gender: 'female',
      birthYearValue: '1997',
      birthYearComparison: 'lte',
    });
    expect(result).toEqual([]);
  });

  it('"이하(gte)" birth-year filter includes profiles born that year or later', () => {
    // 1997년생 이하 → birthYear >= 1997 → 1998은 포함
    const result = filterProfiles([baseProfile], { // birthYear: 1998
      ...noFilter,
      gender: 'female',
      birthYearValue: '1997',
      birthYearComparison: 'gte',
    });
    expect(result.map(p => p.id)).toEqual(['profile-1']);
  });

  it('height gte filter excludes profiles below threshold', () => {
    const result = filterProfiles([baseProfile], { // height: 164
      ...noFilter,
      gender: 'female',
      heightValue: '165',
      heightComparison: 'gte',
    });
    expect(result).toEqual([]);
  });

  it('hides deactivated profiles when active-only filtering is on', () => {
    const result = filterProfiles(
      [baseProfile, {...baseProfile, id: 'profile-2', isActivated: false, status: 'blocked'}],
      {...noFilter, gender: 'female', activeOnly: true},
    );
    expect(result.map(p => p.id)).toEqual(['profile-1']);
  });

  it('places deactivated profiles after active profiles when active-only filtering is off', () => {
    const deactivatedProfile: Profile = {...baseProfile, id: 'profile-2', isActivated: false, status: 'blocked'};
    const result = filterProfiles([deactivatedProfile, baseProfile], {...noFilter, gender: 'female'});
    expect(result.map(p => p.id)).toEqual(['profile-1', 'profile-2']);
  });
});

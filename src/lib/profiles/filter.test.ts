import {describe, expect, it} from 'vitest';

import {filterProfiles} from './filter';
import type {Profile} from '@/types/profile';

const baseProfile: Profile = {
  id: 'profile-1',
  gender: 'female',
  status: 'active',
  isActivated: true,
  authorName: 'Aiden',
  residence: '서울 강남구',
  birthYear: 1998,
  height: 164,
  job: 'ibk / 을지로 / 금융',
  religion: 'none',
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

describe('filterProfiles', () => {
  it('combines gender, single-value numeric filters, select filters, and value search', () => {
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
      birthYearComparison: 'gte',
      heightValue: '170',
      heightComparison: 'lte',
      activeOnly: true,
      religions: ['none'],
      smoking: ['non_smoker'],
      query: 'ibk enfj 강남',
    });

    expect(result.map(profile => profile.id)).toEqual(['profile-1']);
  });

  it('supports less-than-or-equal birth-year and greater-than-or-equal height filters', () => {
    const result = filterProfiles([baseProfile], {
      gender: 'female',
      birthYearValue: '1998',
      birthYearComparison: 'lte',
      heightValue: '164',
      heightComparison: 'gte',
      activeOnly: true,
      religions: [],
      smoking: [],
      query: '',
    });

    expect(result.map(profile => profile.id)).toEqual(['profile-1']);
  });

  it('excludes profiles that do not match the selected numeric comparison', () => {
    const result = filterProfiles([baseProfile], {
      gender: 'female',
      birthYearValue: '1997',
      birthYearComparison: 'lte',
      heightValue: '165',
      heightComparison: 'gte',
      activeOnly: true,
      religions: [],
      smoking: [],
      query: '',
    });

    expect(result).toEqual([]);
  });

  it('hides deactivated profiles by default when active-only filtering is on', () => {
    const result = filterProfiles(
      [
        baseProfile,
        {
          ...baseProfile,
          id: 'profile-2',
          isActivated: false,
          status: 'blocked',
        },
      ],
      {
        gender: 'female',
        birthYearValue: '',
        birthYearComparison: 'gte',
        heightValue: '',
        heightComparison: 'gte',
        activeOnly: true,
        religions: [],
        smoking: [],
        query: '',
      },
    );

    expect(result.map(profile => profile.id)).toEqual(['profile-1']);
  });

  it('places deactivated profiles after active profiles when active-only filtering is off', () => {
    const deactivatedProfile: Profile = {
      ...baseProfile,
      id: 'profile-2',
      isActivated: false,
      status: 'blocked',
    };

    const result = filterProfiles([deactivatedProfile, baseProfile], {
      gender: 'female',
      birthYearValue: '',
      birthYearComparison: 'gte',
      heightValue: '',
      heightComparison: 'gte',
      activeOnly: false,
      religions: [],
      smoking: [],
      query: '',
    });

    expect(result.map(profile => profile.id)).toEqual(['profile-1', 'profile-2']);
  });
});

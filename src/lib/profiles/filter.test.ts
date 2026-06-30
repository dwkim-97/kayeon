import {describe, expect, it} from 'vitest';

import {filterProfiles} from './filter';
import type {Profile} from '@/types/profile';

const baseProfile: Profile = {
  id: 'profile-1',
  gender: 'female',
  status: 'active',
  authorName: 'Aiden',
  residence: '서울 강남구',
  age: 29,
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
  it('combines gender, numeric filters, select filters, and value search', () => {
    const profiles: Profile[] = [
      baseProfile,
      {
        ...baseProfile,
        id: 'profile-2',
        gender: 'male',
        residence: '서울 마포구',
        age: 33,
        height: 178,
        religion: 'christian',
        smoking: 'smoker',
        mbti: 'ISTJ',
      },
    ];

    const result = filterProfiles(profiles, {
      gender: 'female',
      minAge: 28,
      maxAge: 30,
      minHeight: 160,
      maxHeight: 170,
      religions: ['none'],
      smoking: ['non_smoker'],
      query: 'ibk enfj 강남',
    });

    expect(result.map(profile => profile.id)).toEqual(['profile-1']);
  });
});

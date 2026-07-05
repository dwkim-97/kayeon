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
  adminMemo: '',
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
  sortField: 'default' as const,
  sortDirection: 'desc' as const,
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
      sortField: 'default',
      sortDirection: 'desc',
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

  it('sorts by newest createdAt within the same active/starred group', () => {
    const older: Profile = {...baseProfile, id: 'older', createdAt: '2026-06-01T00:00:00.000Z'};
    const newer: Profile = {...baseProfile, id: 'newer', createdAt: '2026-06-30T00:00:00.000Z'};
    const result = filterProfiles([older, newer], {...noFilter, gender: 'female'});
    expect(result.map(p => p.id)).toEqual(['newer', 'older']);
  });

  it('places a starred profile first, even when older or deactivated', () => {
    const newestActive: Profile = {...baseProfile, id: 'newest', createdAt: '2026-07-02T00:00:00.000Z'};
    const oldStar: Profile = {
      ...baseProfile,
      id: 'star',
      createdAt: '2026-01-01T00:00:00.000Z',
      isActivated: false,
      status: 'blocked',
      starredByName: 'Aiden',
    };
    const result = filterProfiles([newestActive, oldStar], {...noFilter, gender: 'female'});
    expect(result.map(p => p.id)).toEqual(['star', 'newest']);
  });

  it('prioritizes any starred profile regardless of who starred it', () => {
    const newest: Profile = {...baseProfile, id: 'newest', createdAt: '2026-07-02T00:00:00.000Z'};
    const otherStar: Profile = {
      ...baseProfile,
      id: 'other-star',
      createdAt: '2026-01-01T00:00:00.000Z',
      starredByName: 'Joy',
    };
    // Joy가 찍은 별이지만 집착매물은 누가 찍었든 앞으로 온다
    const result = filterProfiles([newest, otherStar], {...noFilter, gender: 'female'});
    expect(result.map(p => p.id)).toEqual(['other-star', 'newest']);
  });

  describe('sorting', () => {
    const y1990: Profile = {...baseProfile, id: 'y1990', birthYear: 1990, height: 170, createdAt: '2026-01-01T00:00:00.000Z'};
    const y1995: Profile = {...baseProfile, id: 'y1995', birthYear: 1995, height: 160, createdAt: '2026-03-01T00:00:00.000Z'};
    const y2000: Profile = {...baseProfile, id: 'y2000', birthYear: 2000, height: 180, createdAt: '2026-02-01T00:00:00.000Z'};
    const input = [y1995, y2000, y1990];

    it('age ascending puts the youngest (largest birthYear) first', () => {
      const result = filterProfiles(input, {...noFilter, gender: 'female', sortField: 'age', sortDirection: 'asc'});
      expect(result.map(p => p.id)).toEqual(['y2000', 'y1995', 'y1990']);
    });

    it('age descending puts the oldest (smallest birthYear) first', () => {
      const result = filterProfiles(input, {...noFilter, gender: 'female', sortField: 'age', sortDirection: 'desc'});
      expect(result.map(p => p.id)).toEqual(['y1990', 'y1995', 'y2000']);
    });

    it('height ascending puts the shortest first', () => {
      const result = filterProfiles(input, {...noFilter, gender: 'female', sortField: 'height', sortDirection: 'asc'});
      expect(result.map(p => p.id)).toEqual(['y1995', 'y1990', 'y2000']);
    });

    it('height descending puts the tallest first', () => {
      const result = filterProfiles(input, {...noFilter, gender: 'female', sortField: 'height', sortDirection: 'desc'});
      expect(result.map(p => p.id)).toEqual(['y2000', 'y1990', 'y1995']);
    });

    it('createdAt ascending puts the oldest registration first', () => {
      const result = filterProfiles(input, {...noFilter, gender: 'female', sortField: 'createdAt', sortDirection: 'asc'});
      expect(result.map(p => p.id)).toEqual(['y1990', 'y2000', 'y1995']);
    });

    it('createdAt descending puts the newest registration first', () => {
      const result = filterProfiles(input, {...noFilter, gender: 'female', sortField: 'createdAt', sortDirection: 'desc'});
      expect(result.map(p => p.id)).toEqual(['y1995', 'y2000', 'y1990']);
    });

    it('keeps starred profiles on top even with an explicit sort', () => {
      const star: Profile = {...baseProfile, id: 'star', birthYear: 1985, height: 150, starredByName: 'Aiden'};
      const result = filterProfiles([y2000, star, y1990], {
        ...noFilter,
        gender: 'female',
        sortField: 'height',
        sortDirection: 'asc',
      });
      // star는 키가 가장 작지만 집착매물이라 항상 맨 앞. 나머지는 키 오름차순.
      expect(result.map(p => p.id)).toEqual(['star', 'y1990', 'y2000']);
    });
  });
});

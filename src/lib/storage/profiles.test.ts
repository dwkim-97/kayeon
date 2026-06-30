import {describe, expect, it} from 'vitest';

import {normalizeStoredProfiles} from './profiles';

describe('normalizeStoredProfiles', () => {
  it('migrates legacy job fields into the current job field', () => {
    const profiles = normalizeStoredProfiles([
      {
        id: 'legacy-1',
        gender: 'female',
        status: 'active',
        authorName: 'Aiden',
        name: '예전 이름',
        residence: '서울 강남구',
        age: 29,
        height: 164,
        jobCompany: 'IBK',
        jobLocation: '을지로',
        jobIndustry: '금융',
        religion: 'not_selected',
        mbti: 'enfj',
        hobbies: '독서',
        smoking: 'non_smoker',
        drinking: 'drinker',
        idealType: '다정한 사람',
        matchmakerComment: '성실함',
        extra: '',
        photos: [
          {
            id: 'photo-1',
            url: '/sample.jpg',
            alt: '사진',
            order: 0,
          },
        ],
        createdAt: '2026-06-30T00:00:00.000Z',
        updatedAt: '2026-06-30T00:00:00.000Z',
      },
    ]);

    expect(profiles).toHaveLength(1);
    expect(profiles[0].job).toBe('IBK / 을지로 / 금융');
    expect(profiles[0].birthYear).toBe(1998);
    expect(profiles[0].isActivated).toBe(true);
    expect('name' in profiles[0]).toBe(false);
    expect('age' in profiles[0]).toBe(false);
  });

  it('migrates deactivated legacy profile status into activation data', () => {
    const profiles = normalizeStoredProfiles([
      {
        id: 'legacy-2',
        gender: 'female',
        status: 'blocked',
        authorName: 'Aiden',
        residence: '서울 강남구',
        birthYear: 1998,
        height: 164,
        job: 'IBK / 을지로 / 금융',
        religion: 'not_selected',
        mbti: 'enfj',
        hobbies: '독서',
        smoking: 'non_smoker',
        drinking: 'drinker',
        idealType: '다정한 사람',
        matchmakerComment: '성실함',
        extra: '',
        photos: [],
        createdAt: '2026-06-30T00:00:00.000Z',
        updatedAt: '2026-06-30T00:00:00.000Z',
      },
    ]);

    expect(profiles[0].isActivated).toBe(false);
    expect(profiles[0].status).toBe('blocked');
  });
});

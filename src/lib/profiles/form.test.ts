import {describe, expect, it} from 'vitest';

import {normalizeProfileFormValues, validateProfileFormValues} from './form';
import type {ProfileFormValues} from './form';

const validValues: ProfileFormValues = {
  gender: 'female',
  residence: '서울 강남구',
  birthYear: '1998',
  height: '164',
  job: 'ibk / 을지로 / 금융',
  religion: 'none',
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
      url: '/sample-1.jpg',
      alt: '사진 1',
      order: 0,
    },
  ],
};

describe('profile form helpers', () => {
  it('normalizes MBTI to uppercase and numeric inputs to numbers', () => {
    const normalized = normalizeProfileFormValues(validValues);

    expect(normalized.mbti).toBe('ENFJ');
    expect(normalized.birthYear).toBe(1998);
    expect(normalized.height).toBe(164);
    expect(normalized.job).toBe('ibk / 을지로 / 금융');
  });

  it('requires core fields except name and rejects more than four photos', () => {
    const result = validateProfileFormValues({
      ...validValues,
      job: '',
      residence: '',
      photos: [0, 1, 2, 3, 4].map(index => ({
        id: `photo-${index}`,
        url: `/sample-${index}.jpg`,
        alt: `사진 ${index}`,
        order: index,
      })),
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('사는 곳을 입력해 주세요.');
    expect(result.errors).toContain('회사명/위치/업종을 입력해 주세요.');
    expect(result.errors).toContain('사진은 최대 4장까지 등록할 수 있습니다.');
  });
});

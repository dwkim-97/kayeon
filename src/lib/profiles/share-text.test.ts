import {describe, expect, it} from 'vitest';

import {buildShareText} from './share-text';
import type {Profile} from '@/types/profile';

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    id: 'p',
    gender: 'female',
    status: 'active',
    isActivated: true,
    authorName: 'Aiden',
    starredByName: null,
    residence: '서울 강남구',
    birthYear: 1995,
    height: 168,
    job: '카카오 / 판교 / IT',
    religion: 'none',
    mbti: 'ENFJ',
    hobbies: '독서',
    smoking: 'not_selected',
    drinking: 'not_selected',
    idealType: '',
    matchmakerComment: '',
    extra: '',
    adminMemo: '비밀 메모',
    probe: 'possible',
    rejectionTolerance: 'high',
    responseSpeed: 'fast',
    photos: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildShareText', () => {
  it('starts with the birth-year label line', () => {
    const text = buildShareText(makeProfile({}));
    expect(text.split('\n')[0]).toBe('95년생');
  });

  it('includes primary + additional info as label: value lines', () => {
    const text = buildShareText(makeProfile({}));
    expect(text).toContain('키: 168cm');
    expect(text).toContain('사는 곳: 서울 강남구');
    expect(text).toContain('회사: 카카오 / 판교 / IT');
    expect(text).toContain('종교: 무교');
    expect(text).toContain('MBTI: ENFJ');
  });

  it('excludes admin memo and admin-only fields', () => {
    const text = buildShareText(makeProfile({}));
    expect(text).not.toContain('비밀 메모');
    expect(text).not.toContain('떠보기');
    expect(text).not.toContain('거절내성');
    expect(text).not.toContain('응답속도');
  });

  it('omits empty optional values', () => {
    const text = buildShareText(makeProfile({mbti: '', hobbies: '', religion: 'not_selected'}));
    expect(text).not.toContain('MBTI');
    expect(text).not.toContain('취미');
    expect(text).not.toContain('종교');
  });
});

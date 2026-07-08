import {describe, expect, it} from 'vitest';

import {countNewArrivals, latestCreatedAt} from './new-arrivals';
import type {Profile} from '@/types/profile';

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    id: 'p',
    gender: 'female',
    status: 'active',
    isActivated: true,
    authorName: 'Aiden',
    starredByName: null,
    residence: '서울',
    birthYear: 1995,
    height: 165,
    job: '회사',
    religion: 'not_selected',
    mbti: '',
    hobbies: '',
    smoking: 'not_selected',
    drinking: 'not_selected',
    idealType: '',
    matchmakerComment: '',
    extra: '',
    adminMemo: '',
    probe: 'not_selected',
    rejectionTolerance: 'not_selected',
    responseSpeed: 'not_selected',
    photos: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('countNewArrivals', () => {
  const profiles = [
    makeProfile({id: 'old', createdAt: '2026-07-01T00:00:00.000Z'}),
    makeProfile({id: 'new1', createdAt: '2026-07-05T00:00:00.000Z'}),
    makeProfile({id: 'new2', createdAt: '2026-07-06T00:00:00.000Z'}),
  ];

  it('counts profiles created after lastSeenAt', () => {
    expect(countNewArrivals(profiles, '2026-07-03T00:00:00.000Z')).toBe(2);
  });

  it('returns 0 on first visit (no lastSeenAt)', () => {
    expect(countNewArrivals(profiles, null)).toBe(0);
  });

  it('excludes deactivated profiles', () => {
    const withBlocked = [
      ...profiles,
      makeProfile({id: 'blocked', isActivated: false, createdAt: '2026-07-07T00:00:00.000Z'}),
    ];
    expect(countNewArrivals(withBlocked, '2026-07-03T00:00:00.000Z')).toBe(2);
  });

  it('returns 0 when lastSeenAt is unparseable', () => {
    expect(countNewArrivals(profiles, 'not-a-date')).toBe(0);
  });
});

describe('latestCreatedAt', () => {
  it('returns the newest createdAt', () => {
    const profiles = [
      makeProfile({createdAt: '2026-07-01T00:00:00.000Z'}),
      makeProfile({createdAt: '2026-07-06T00:00:00.000Z'}),
      makeProfile({createdAt: '2026-07-03T00:00:00.000Z'}),
    ];
    expect(latestCreatedAt(profiles)).toBe('2026-07-06T00:00:00.000Z');
  });

  it('returns null for an empty list', () => {
    expect(latestCreatedAt([])).toBeNull();
  });
});

import {describe, expect, it} from 'vitest';

import {countOngoingByProfile, getMatchCandidates, getOngoingPairs, getProfileMatches} from './summary';
import type {Match} from '@/types/match';
import type {Profile} from '@/types/profile';

const match = (over: Partial<Match>): Match => ({
  id: 'm',
  femaleId: 'f',
  maleId: 'm1',
  status: 'ongoing',
  memo: '',
  createdByName: 'A',
  createdAt: '2026-07-01T00:00:00Z',
  endedAt: null,
  ...over,
});

const profile = (over: Partial<Profile>): Profile => ({
  id: 'p',
  gender: 'female',
  status: 'active',
  isActivated: true,
  authorName: 'A',
  starredByName: null,
  residence: 'x',
  birthYear: 1996,
  height: 160,
  job: 'j',
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
  reward: '',
  manualOrderWeight: 0,
  photos: [],
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
  ...over,
});

describe('countOngoingByProfile', () => {
  it('counts ongoing matches for both female and male sides', () => {
    const m = countOngoingByProfile([
      match({id: 'm1', femaleId: 'f1', maleId: 'g1'}),
      match({id: 'm2', femaleId: 'f1', maleId: 'g2'}),
      match({id: 'm3', femaleId: 'f2', maleId: 'g1', status: 'ended'}),
    ]);
    expect(m.get('f1')).toBe(2);
    expect(m.get('g1')).toBe(1); // ended 제외
    expect(m.get('g2')).toBe(1);
    expect(m.get('f2')).toBeUndefined();
  });
});

describe('getMatchCandidates', () => {
  it('returns opposite-gender active profiles only', () => {
    const female = profile({id: 'f1', gender: 'female'});
    const maleActive = profile({id: 'g1', gender: 'male'});
    const maleBlocked = profile({id: 'g2', gender: 'male', isActivated: false, status: 'blocked'});
    const otherFemale = profile({id: 'f2', gender: 'female'});
    const result = getMatchCandidates(female, [female, maleActive, maleBlocked, otherFemale]);
    expect(result.map(p => p.id)).toEqual(['g1']);
  });
});

describe('getProfileMatches', () => {
  it('returns matches where the profile is on either side', () => {
    const matches = [
      match({id: 'm1', femaleId: 'f1'}),
      match({id: 'm2', maleId: 'f1'}),
      match({id: 'm3', femaleId: 'x', maleId: 'y'}),
    ];
    expect(getProfileMatches('f1', matches).map(m => m.id)).toEqual(['m1', 'm2']);
  });
});

describe('getOngoingPairs', () => {
  const female = {id: 'f1', gender: 'female'} as Profile;
  const male = {id: 'm1', gender: 'male'} as Profile;
  const mk = (over: Partial<Match>): Match => ({
    id: 'x', femaleId: 'f1', maleId: 'm1', status: 'ongoing', memo: '',
    createdByName: 'A', createdAt: '2026-07-01T00:00:00.000Z', endedAt: null, ...over,
  });

  it('returns ongoing pairs resolved to profiles, newest first', () => {
    const matches = [
      mk({id: 'old', createdAt: '2026-06-01T00:00:00.000Z'}),
      mk({id: 'new', createdAt: '2026-07-10T00:00:00.000Z'}),
      mk({id: 'ended', status: 'ended'}),
    ];
    const pairs = getOngoingPairs(matches, [female, male]);
    expect(pairs.map(p => p.match.id)).toEqual(['new', 'old']);
    expect(pairs[0].female?.id).toBe('f1');
    expect(pairs[0].male?.id).toBe('m1');
  });

  it('keeps pair with a deleted side as undefined', () => {
    const pairs = getOngoingPairs([mk({})], [female]); // male missing
    expect(pairs[0].female?.id).toBe('f1');
    expect(pairs[0].male).toBeUndefined();
  });
});

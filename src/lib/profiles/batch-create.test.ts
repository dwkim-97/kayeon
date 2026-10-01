import {describe, expect, it, vi} from 'vitest';

import {finalizeProfileCreation, settleProfileCreations} from './batch-create';
import type {Profile} from '@/types/profile';

function makeProfile(id: string): Profile {
  return {
    id,
    gender: 'female',
    status: 'active',
    isActivated: true,
    authorName: '테스트',
    starredByName: null,
    residence: '서울',
    birthYear: 1995,
    height: 165,
    job: '회사원',
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
    createdAt: '2026-09-30T00:00:00.000Z',
    updatedAt: '2026-09-30T00:00:00.000Z',
  };
}

describe('batch profile creation', () => {
  it('removes the created row when photo storage fails', async () => {
    const profile = makeProfile('photo-failed');
    const rolledBackProfileIds: string[] = [];

    await expect(
      finalizeProfileCreation(
        profile,
        async () => {
          throw new Error('사진 저장 실패');
        },
        async profileId => {
          rolledBackProfileIds.push(profileId);
        },
      ),
    ).rejects.toThrow('사진 저장 실패');

    expect(rolledBackProfileIds).toEqual(['photo-failed']);
  });

  it('keeps creating later profiles after one profile fails', async () => {
    const profiles = [makeProfile('first'), makeProfile('failed'), makeProfile('last')];
    const result = await settleProfileCreations(
      profiles,
      async profile => {
        if (profile.id === 'failed') throw new Error('사진 저장 실패');
        return {...profile, residence: `${profile.residence} 저장됨`};
      },
      () => undefined,
    );

    expect(result.created.map(profile => profile.id)).toEqual(['first', 'last']);
    expect(result.failures).toEqual([{profile: profiles[1], message: '사진 저장 실패'}]);
  });

  it('processes at most ten profiles at once and reports each item progress', async () => {
    const profiles = Array.from({length: 21}, (_, index) => makeProfile(`profile-${index + 1}`));
    const startedIds: string[] = [];
    const resolvers = new Map<string, (profile: Profile) => void>();
    const progressEvents: Array<{phase: string; profileId: string; completedCount: number; totalCount: number}> = [];

    const creation = settleProfileCreations(
      profiles,
      profile => {
        startedIds.push(profile.id);
        return new Promise<Profile>(resolve => resolvers.set(profile.id, resolve));
      },
      progress => {
        progressEvents.push({
          phase: progress.phase,
          profileId: progress.profile.id,
          completedCount: progress.completedCount,
          totalCount: progress.totalCount,
        });
      },
    );

    await vi.waitFor(() => expect(startedIds).toEqual(profiles.slice(0, 10).map(profile => profile.id)));
    profiles.slice(0, 10).forEach(profile => resolvers.get(profile.id)?.(profile));
    await vi.waitFor(() => expect(startedIds).toEqual(profiles.slice(0, 20).map(profile => profile.id)));
    profiles.slice(10, 20).forEach(profile => resolvers.get(profile.id)?.(profile));
    await vi.waitFor(() => expect(startedIds).toEqual(profiles.map(profile => profile.id)));
    resolvers.get('profile-21')?.(profiles[20]);

    await expect(creation).resolves.toEqual({created: profiles, failures: []});
    expect(progressEvents.filter(event => event.phase === 'started')).toHaveLength(21);
    expect(progressEvents.filter(event => event.phase === 'created').map(event => event.completedCount)).toEqual(
      Array.from({length: 21}, (_, index) => index + 1),
    );
    expect(progressEvents.at(-1)).toEqual({
      phase: 'created',
      profileId: 'profile-21',
      completedCount: 21,
      totalCount: 21,
    });
  });
});

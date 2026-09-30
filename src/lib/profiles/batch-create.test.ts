import {describe, expect, it} from 'vitest';

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
    const result = await settleProfileCreations(profiles, async profile => {
      if (profile.id === 'failed') throw new Error('사진 저장 실패');
      return {...profile, residence: `${profile.residence} 저장됨`};
    });

    expect(result.created.map(profile => profile.id)).toEqual(['first', 'last']);
    expect(result.failures).toEqual([{profile: profiles[1], message: '사진 저장 실패'}]);
  });
});

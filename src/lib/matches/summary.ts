import type {Match} from '@/types/match';
import type {Profile} from '@/types/profile';

// 프로필 id별 진행중 매칭 수 (여성/남성 양쪽 모두 카운트)
export function countOngoingByProfile(matches: Match[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of matches) {
    if (m.status !== 'ongoing') continue;
    counts.set(m.femaleId, (counts.get(m.femaleId) ?? 0) + 1);
    counts.set(m.maleId, (counts.get(m.maleId) ?? 0) + 1);
  }
  return counts;
}

// 매칭 상대 후보: 반대 성별 + 활성 매물
export function getMatchCandidates(profile: Profile, all: Profile[]): Profile[] {
  const opposite = profile.gender === 'female' ? 'male' : 'female';
  return all.filter(p => p.gender === opposite && p.isActivated);
}

// 해당 프로필이 (여성 또는 남성으로) 속한 매칭
export function getProfileMatches(profileId: string, matches: Match[]): Match[] {
  return matches.filter(m => m.femaleId === profileId || m.maleId === profileId);
}

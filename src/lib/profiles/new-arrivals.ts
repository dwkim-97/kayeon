import type {Profile} from '@/types/profile';

// "새 매물" 감지 로직.
// 사용자가 마지막으로 대시보드를 확인한 시점(lastSeenAt, ISO 문자열)을 기준으로
// 그 이후에 등록된(createdAt이 더 최신인) 활성 매물의 개수를 센다.
// lastSeenAt이 없으면(최초 방문) 놀래키지 않도록 0으로 취급한다.

export const NEW_ARRIVAL_STORAGE_KEY = 'kayeon_last_seen_at';

export function countNewArrivals(profiles: Profile[], lastSeenAt: string | null): number {
  if (!lastSeenAt) return 0;
  const threshold = Date.parse(lastSeenAt);
  if (Number.isNaN(threshold)) return 0;
  return profiles.filter(profile => {
    if (!profile.isActivated) return false;
    const created = Date.parse(profile.createdAt);
    return !Number.isNaN(created) && created > threshold;
  }).length;
}

// 가장 최근 등록 매물의 createdAt을 반환한다(다음 방문 기준점으로 저장). 없으면 null.
export function latestCreatedAt(profiles: Profile[]): string | null {
  let latest: string | null = null;
  let latestMs = -Infinity;
  for (const profile of profiles) {
    const ms = Date.parse(profile.createdAt);
    if (!Number.isNaN(ms) && ms > latestMs) {
      latestMs = ms;
      latest = profile.createdAt;
    }
  }
  return latest;
}

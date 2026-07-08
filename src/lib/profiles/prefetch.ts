import {DETAIL_IMAGE_WIDTH, photoThumbnailUrl} from '@/lib/profiles/photo-url';
import type {Profile} from '@/types/profile';

// 상세보기(슬라이더/라이트박스)에서 실제 쓰는 큰 사진 URL 목록을 모은다(중복 제거).
// 대시보드를 보는 동안 이 URL들을 백그라운드로 미리 로드해두면,
// 상세보기 진입 시 브라우저 캐시에서 즉시 떠서 체감 성능이 올라간다.
// 대표사진(각 매물 첫 장)을 앞에 모아 우선 로드되게 정렬한다.
export function collectDetailPhotoUrls(profiles: Profile[]): string[] {
  const seen = new Set<string>();
  const primary: string[] = [];
  const rest: string[] = [];

  for (const profile of profiles) {
    profile.photos.forEach((photo, index) => {
      const url = photoThumbnailUrl(photo.url, DETAIL_IMAGE_WIDTH);
      if (seen.has(url)) return;
      seen.add(url);
      (index === 0 ? primary : rest).push(url);
    });
  }

  return [...primary, ...rest];
}

import type {ProfileFilters} from '@/types/profile';

// 수동 순서 드래그가 의미 있는 조건: 기본 정렬 + 필터/검색 없음.
// (다른 정렬이면 뷰가 그 기준으로 재정렬되고, 필터가 걸리면 보이는 부분만
//  재색인돼 숨은 매물과 가중치가 충돌하므로 순서 저장이 신뢰 불가.)
export function canReorderProfiles(filters: ProfileFilters): boolean {
  return (
    filters.sortField === 'default' &&
    filters.query.trim() === '' &&
    filters.birthYearValue.trim() === '' &&
    filters.heightValue.trim() === '' &&
    filters.religion === '' &&
    filters.smoking === '' &&
    !filters.activeOnly
  );
}

import type {NumericComparison, Profile, ProfileFilters, SortDirection, SortField} from '@/types/profile';

const normalize = (value: string) => value.trim().toLowerCase();
const toFilterNumber = (value: string) => {
  const numberValue = Number(value);
  return value.trim() && Number.isFinite(numberValue) ? numberValue : null;
};

// birthYear 필터: "이상(lte)" = 해당 연도보다 크거나 같은 birthYear는 제외 (더 나이 많은 사람만)
// 예: 1997년생 이상 → birthYear <= 1996 → profileValue > filterValue 이면 탈락
// height 필터: "이상(gte)" = 해당 값보다 작으면 탈락 (일반적 방향)
const failsBirthYearFilter = (profileValue: number, filterValue: number | null, comparison: NumericComparison) => {
  if (filterValue === null) return false;
  // lte label="이상": 나이가 filterValue 이상 → birthYear가 filterValue 이하여야 함
  // gte label="이하": 나이가 filterValue 이하 → birthYear가 filterValue 이상이어야 함
  return comparison === 'lte' ? profileValue > filterValue : profileValue < filterValue;
};

const failsHeightFilter = (profileValue: number, filterValue: number | null, comparison: NumericComparison) =>
  filterValue !== null && (comparison === 'gte' ? profileValue < filterValue : profileValue > filterValue);

const profileSearchText = (profile: Profile) =>
  [
    profile.authorName,
    profile.residence,
    profile.birthYear.toString(),
    profile.height.toString(),
    profile.job,
    profile.religion,
    profile.mbti,
    profile.hobbies,
    profile.smoking,
    profile.drinking,
    profile.idealType,
    profile.matchmakerComment,
    profile.extra,
  ]
    .map(normalize)
    .join(' ');

// 기본 정렬(정렬 옵션 미지정): 활성(active) → 최신 등록순(created_at desc).
function compareDefault(left: Profile, right: Profile) {
  if (left.isActivated !== right.isActivated) return Number(right.isActivated) - Number(left.isActivated);
  // created_at은 ISO 8601 문자열이라 사전식 비교로 시간순이 보장된다.
  return right.createdAt.localeCompare(left.createdAt);
}

// 사용자가 고른 정렬 기준. asc는 "작은 값/어린 나이/오래된 등록"이 먼저 온다.
// 나이(age) asc = 어린 순 → birthYear는 큰 값이 먼저이므로 부호를 뒤집는다.
function compareBySort(left: Profile, right: Profile, field: SortField, direction: SortDirection): number {
  let base: number;
  switch (field) {
    case 'age':
      base = left.birthYear - right.birthYear; // birthYear asc = 나이 desc
      return direction === 'asc' ? -base : base;
    case 'height':
      base = left.height - right.height;
      return direction === 'asc' ? base : -base;
    case 'createdAt':
      base = left.createdAt.localeCompare(right.createdAt);
      return direction === 'asc' ? base : -base;
    default:
      return 0;
  }
}

// 정렬 우선순위: 집착매물 → (정렬 옵션 또는 기본 정렬).
// 집착매물은 누가 찍었든(starredByName이 있으면) 항상 맨 앞으로 온다.
function compareProfiles(left: Profile, right: Profile, sortField: SortField, sortDirection: SortDirection) {
  const leftStarred = left.starredByName ? 1 : 0;
  const rightStarred = right.starredByName ? 1 : 0;
  if (rightStarred !== leftStarred) return rightStarred - leftStarred;

  if (sortField === 'default') return compareDefault(left, right);

  const sorted = compareBySort(left, right, sortField, sortDirection);
  // 동점이면 등록 최신순으로 안정적 타이브레이크
  return sorted !== 0 ? sorted : right.createdAt.localeCompare(left.createdAt);
}

export function filterProfiles(profiles: Profile[], filters: ProfileFilters) {
  const queryTerms = normalize(filters.query).split(/\s+/).filter(Boolean);
  const birthYearValue = toFilterNumber(filters.birthYearValue);
  const heightValue = toFilterNumber(filters.heightValue);

  return profiles
    .filter(profile => {
      if (profile.gender !== filters.gender) return false;
      if (filters.activeOnly && !profile.isActivated) return false;
      if (failsBirthYearFilter(profile.birthYear, birthYearValue, filters.birthYearComparison)) return false;
      if (failsHeightFilter(profile.height, heightValue, filters.heightComparison)) return false;
      if (filters.religion && profile.religion !== filters.religion) return false;
      if (filters.smoking && profile.smoking !== filters.smoking) return false;

      const searchText = profileSearchText(profile);
      return queryTerms.every(term => searchText.includes(term));
    })
    .sort((left, right) => compareProfiles(left, right, filters.sortField, filters.sortDirection));
}

import type {NumericComparison, Profile, ProfileFilters} from '@/types/profile';

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
    .sort((left, right) => {
      // 1순위: 별표 있음
      const leftStarred = left.starredByName ? 1 : 0;
      const rightStarred = right.starredByName ? 1 : 0;
      if (rightStarred !== leftStarred) return rightStarred - leftStarred;
      // 2순위: 활성화 여부
      return Number(right.isActivated) - Number(left.isActivated);
    });
}

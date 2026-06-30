import type {NumericComparison, Profile, ProfileFilters} from '@/types/profile';

const normalize = (value: string) => value.trim().toLowerCase();
const toFilterNumber = (value: string) => {
  const numberValue = Number(value);

  return value.trim() && Number.isFinite(numberValue) ? numberValue : null;
};

const failsNumericFilter = (profileValue: number, filterValue: number | null, comparison: NumericComparison) =>
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
  const queryTerms = normalize(filters.query)
    .split(/\s+/)
    .filter(Boolean);
  const birthYearValue = toFilterNumber(filters.birthYearValue);
  const heightValue = toFilterNumber(filters.heightValue);

  return profiles.filter(profile => {
    if (profile.gender !== filters.gender) {
      return false;
    }

    if (filters.activeOnly && !profile.isActivated) {
      return false;
    }

    if (failsNumericFilter(profile.birthYear, birthYearValue, filters.birthYearComparison)) {
      return false;
    }

    if (failsNumericFilter(profile.height, heightValue, filters.heightComparison)) {
      return false;
    }

    if (filters.religions.length > 0 && !filters.religions.includes(profile.religion)) {
      return false;
    }

    if (filters.smoking.length > 0 && !filters.smoking.includes(profile.smoking)) {
      return false;
    }

    const searchText = profileSearchText(profile);
    return queryTerms.every(term => searchText.includes(term));
  }).sort((left, right) => Number(right.isActivated) - Number(left.isActivated));
}

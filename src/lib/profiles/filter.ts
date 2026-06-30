import type {Profile, ProfileFilters} from '@/types/profile';

const normalize = (value: string) => value.trim().toLowerCase();

const profileSearchText = (profile: Profile) =>
  [
    profile.authorName,
    profile.residence,
    profile.age.toString(),
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

  return profiles.filter(profile => {
    if (profile.gender !== filters.gender) {
      return false;
    }

    if (profile.age < filters.minAge || profile.age > filters.maxAge) {
      return false;
    }

    if (profile.height < filters.minHeight || profile.height > filters.maxHeight) {
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
  });
}

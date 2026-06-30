import {sampleProfiles} from '@/lib/profiles/sample-data';
import type {Profile} from '@/types/profile';

const STORAGE_KEY = 'kayeon_profiles_v1';

export function loadProfiles() {
  if (typeof window === 'undefined') {
    return sampleProfiles;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return sampleProfiles;
  }

  try {
    return JSON.parse(stored) as Profile[];
  } catch {
    return sampleProfiles;
  }
}

export function saveProfiles(profiles: Profile[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

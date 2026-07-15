import {sampleProfiles} from '@/lib/profiles/sample-data';
import {birthYearFromAge} from '@/lib/profiles/age';
import type {
  Drinking,
  Gender,
  Probe,
  RejectionTolerance,
  Profile,
  ProfilePhoto,
  ProfileStatus,
  Religion,
  ResponseSpeed,
  Smoking,
} from '@/types/profile';

const STORAGE_KEY = 'kayeon_profiles_v1';
const genderValues: Gender[] = ['female', 'male'];
const statusValues: ProfileStatus[] = ['active', 'blocked'];
const religionValues: Religion[] = ['christian', 'buddhist', 'catholic', 'none', 'not_selected'];
const smokingValues: Smoking[] = ['smoker', 'non_smoker', 'not_selected'];
const drinkingValues: Drinking[] = ['drinker', 'non_drinker', 'not_selected'];
const probeValues: Probe[] = ['possible', 'impossible', 'not_selected'];
const rejectionToleranceValues: RejectionTolerance[] = ['high', 'mid', 'low', 'not_selected'];
const responseSpeedValues: ResponseSpeed[] = ['fast', 'normal', 'slow', 'not_selected'];

export function loadProfiles() {
  if (typeof window === 'undefined') {
    return sampleProfiles;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return sampleProfiles;
  }

  try {
    return normalizeStoredProfiles(JSON.parse(stored));
  } catch {
    return sampleProfiles;
  }
}

export function saveProfiles(profiles: Profile[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function normalizeStoredProfiles(input: unknown) {
  if (!Array.isArray(input)) {
    return sampleProfiles;
  }

  return input.filter(isRecord).map((profile, index) => normalizeStoredProfile(profile, index));
}

function normalizeStoredProfile(profile: Record<string, unknown>, index: number): Profile {
  const now = new Date().toISOString();
  const isActivated = isActivatedField(profile);

  return {
    id: stringField(profile, 'id', `profile-${index}`),
    gender: enumField(profile, 'gender', genderValues, 'female'),
    status: isActivated ? 'active' : 'blocked',
    isActivated,
    authorName: stringField(profile, 'authorName', '미입력'),
    starredByName: nullableStringField(profile, 'starredByName'),
    residence: stringField(profile, 'residence', '미입력'),
    birthYear: birthYearField(profile),
    height: numberField(profile, 'height', 0),
    job: jobField(profile),
    religion: enumField(profile, 'religion', religionValues, 'not_selected'),
    mbti: stringField(profile, 'mbti', ''),
    hobbies: stringField(profile, 'hobbies', ''),
    smoking: enumField(profile, 'smoking', smokingValues, 'not_selected'),
    drinking: enumField(profile, 'drinking', drinkingValues, 'not_selected'),
    idealType: stringField(profile, 'idealType', ''),
    matchmakerComment: stringField(profile, 'matchmakerComment', ''),
    extra: stringField(profile, 'extra', ''),
    adminMemo: stringField(profile, 'adminMemo', ''),
    probe: enumField(profile, 'probe', probeValues, 'not_selected'),
    rejectionTolerance: enumField(profile, 'rejectionTolerance', rejectionToleranceValues, 'not_selected'),
    responseSpeed: enumField(profile, 'responseSpeed', responseSpeedValues, 'not_selected'),
    reward: stringField(profile, 'reward', ''),
    manualOrderWeight: numberField(profile, 'manualOrderWeight', 0),
    photos: photoField(profile, 'photos'),
    createdAt: stringField(profile, 'createdAt', now),
    updatedAt: stringField(profile, 'updatedAt', now),
  };
}

function isActivatedField(profile: Record<string, unknown>) {
  const value = profile.isActivated;

  if (typeof value === 'boolean') {
    return value;
  }

  return enumField(profile, 'status', statusValues, 'active') === 'active';
}

function birthYearField(profile: Record<string, unknown>) {
  const birthYear = numberField(profile, 'birthYear', 0);

  if (birthYear > 0) {
    return birthYear;
  }

  const legacyAge = numberField(profile, 'age', 0);

  return legacyAge > 0 ? birthYearFromAge(legacyAge, new Date().getFullYear()) : 0;
}

function jobField(profile: Record<string, unknown>) {
  const currentJob = stringField(profile, 'job', '');

  if (currentJob) {
    return currentJob;
  }

  const legacyParts = ['jobCompany', 'jobLocation', 'jobIndustry']
    .map(key => stringField(profile, key, ''))
    .filter(Boolean);

  return legacyParts.length > 0 ? legacyParts.join(' / ') : '미입력';
}

function photoField(profile: Record<string, unknown>, key: string) {
  const value = profile[key];

  if (!Array.isArray(value)) {
    return [] as ProfilePhoto[];
  }

  return value.filter(isRecord).flatMap((photo, index) => {
    const url = stringField(photo, 'url', '');

    if (!url) {
      return [] as ProfilePhoto[];
    }

    return [
      {
        id: stringField(photo, 'id', `photo-${index}`),
        url,
        alt: stringField(photo, 'alt', `프로필 사진 ${index + 1}`),
        order: numberField(photo, 'order', index),
      },
    ];
  });
}

function nullableStringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value.trim() || null : null;
}

function stringField(record: Record<string, unknown>, key: string, fallback: string) {
  const value = record[key];

  return typeof value === 'string' ? value.trim() : fallback;
}

function numberField(record: Record<string, unknown>, key: string, fallback: number) {
  const value = record[key];
  const numberValue = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function enumField<TValue extends string>(
  record: Record<string, unknown>,
  key: string,
  values: TValue[],
  fallback: TValue,
) {
  const value = record[key];

  return typeof value === 'string' && values.includes(value as TValue) ? (value as TValue) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

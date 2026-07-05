import type {Drinking, Gender, Profile, ProfilePhoto, Religion, Smoking} from '@/types/profile';

export type ProfileFormValues = {
  gender: Gender;
  residence: string;
  birthYear: string;
  height: string;
  job: string;
  religion: Religion;
  mbti: string;
  hobbies: string;
  smoking: Smoking;
  drinking: Drinking;
  idealType: string;
  matchmakerComment: string;
  extra: string;
  adminMemo: string;
  photos: ProfilePhoto[];
};

export type NormalizedProfileFormValues = Omit<ProfileFormValues, 'birthYear' | 'height'> & {
  birthYear: number;
  height: number;
};

export type ProfileFormValidationResult =
  | {
      success: true;
      errors: string[];
    }
  | {
      success: false;
      errors: string[];
    };

const requiredTextFields: Array<[keyof ProfileFormValues, string]> = [
  ['residence', '사는 곳을 입력해 주세요.'],
  ['birthYear', '년생을 선택해 주세요.'],
  ['height', '키를 입력해 주세요.'],
  ['job', '회사명/위치/업종을 입력해 주세요.'],
];

export const defaultBirthYear = 1995;

function getBirthYearBounds() {
  const currentYear = new Date().getFullYear();

  return {
    oldestBirthYear: currentYear - 80 + 1,
    youngestBirthYear: currentYear - 19 + 1,
  };
}

// Computed once at module load — stable for the lifetime of the process.
export const birthYearBounds = getBirthYearBounds();

export const emptyProfileFormValues: ProfileFormValues = {
  gender: 'female',
  residence: '',
  birthYear: defaultBirthYear.toString(),
  height: '',
  job: '',
  religion: 'not_selected',
  mbti: '',
  hobbies: '',
  smoking: 'not_selected',
  drinking: 'not_selected',
  idealType: '',
  matchmakerComment: '',
  extra: '',
  adminMemo: '',
  photos: [],
};

export function profileToFormValues(profile: Profile): ProfileFormValues {
  return {
    gender: profile.gender,
    residence: profile.residence,
    birthYear: profile.birthYear.toString(),
    height: profile.height.toString(),
    job: profile.job,
    religion: profile.religion,
    mbti: profile.mbti,
    hobbies: profile.hobbies,
    smoking: profile.smoking,
    drinking: profile.drinking,
    idealType: profile.idealType,
    matchmakerComment: profile.matchmakerComment,
    extra: profile.extra,
    adminMemo: profile.adminMemo,
    photos: profile.photos,
  };
}

export function normalizeProfileFormValues(values: ProfileFormValues): NormalizedProfileFormValues {
  return {
    ...values,
    residence: values.residence.trim(),
    birthYear: Number(values.birthYear),
    height: Number(values.height),
    job: values.job.trim(),
    mbti: values.mbti.trim().toUpperCase(),
    hobbies: values.hobbies.trim(),
    idealType: values.idealType.trim(),
    matchmakerComment: values.matchmakerComment.trim(),
    extra: values.extra.trim(),
    adminMemo: values.adminMemo.trim(),
    photos: values.photos.map((photo, order) => ({...photo, order})),
  };
}

export function validateProfileFormValues(values: ProfileFormValues): ProfileFormValidationResult {
  const errors = requiredTextFields
    .filter(([field]) => String(values[field]).trim().length === 0)
    .map(([, message]) => message);

  if (values.photos.length === 0) {
    errors.push('사진을 1장 이상 등록해 주세요.');
  }

  if (values.photos.length > 4) {
    errors.push('사진은 최대 4장까지 등록할 수 있습니다.');
  }

  const birthYear = Number(values.birthYear);
  const {oldestBirthYear, youngestBirthYear} = birthYearBounds;
  if (!Number.isInteger(birthYear) || birthYear < oldestBirthYear || birthYear > youngestBirthYear) {
    errors.push(`년생은 ${oldestBirthYear}년부터 ${youngestBirthYear}년 사이에서 선택해 주세요.`);
  }

  const height = Number(values.height);
  if (!Number.isInteger(height) || height < 120 || height > 230) {
    errors.push('키는 120cm 이상 230cm 이하의 숫자로 입력해 주세요.');
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

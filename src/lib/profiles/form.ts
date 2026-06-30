import type {Drinking, Gender, Profile, ProfilePhoto, Religion, Smoking} from '@/types/profile';

export type ProfileFormValues = {
  gender: Gender;
  residence: string;
  age: string;
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
  photos: ProfilePhoto[];
};

export type NormalizedProfileFormValues = Omit<ProfileFormValues, 'age' | 'height'> & {
  age: number;
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
  ['age', '나이를 입력해 주세요.'],
  ['height', '키를 입력해 주세요.'],
  ['job', '회사명/위치/업종을 입력해 주세요.'],
];

export const emptyProfileFormValues: ProfileFormValues = {
  gender: 'female',
  residence: '',
  age: '',
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
  photos: [],
};

export function profileToFormValues(profile: Profile): ProfileFormValues {
  return {
    gender: profile.gender,
    residence: profile.residence,
    age: profile.age.toString(),
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
    photos: profile.photos,
  };
}

export function normalizeProfileFormValues(values: ProfileFormValues): NormalizedProfileFormValues {
  return {
    ...values,
    residence: values.residence.trim(),
    age: Number(values.age),
    height: Number(values.height),
    job: values.job.trim(),
    mbti: values.mbti.trim().toUpperCase(),
    hobbies: values.hobbies.trim(),
    idealType: values.idealType.trim(),
    matchmakerComment: values.matchmakerComment.trim(),
    extra: values.extra.trim(),
    photos: values.photos
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((photo, order) => ({...photo, order})),
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

  const age = Number(values.age);
  if (!Number.isInteger(age) || age < 19 || age > 80) {
    errors.push('나이는 19세 이상 80세 이하의 숫자로 입력해 주세요.');
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

export type Gender = 'male' | 'female';
export type ProfileStatus = 'active' | 'blocked';
export type Religion = 'christian' | 'buddhist' | 'catholic' | 'not_selected';
export type Smoking = 'smoker' | 'non_smoker' | 'not_selected';
export type Drinking = 'drinker' | 'non_drinker' | 'not_selected';
export type NumericComparison = 'gte' | 'lte';

export type ProfilePhoto = {
  id: string;
  url: string;
  alt: string;
  order: number;
};

export type Profile = {
  id: string;
  gender: Gender;
  status: ProfileStatus;
  isActivated: boolean;
  authorName: string;
  residence: string;
  birthYear: number;
  height: number;
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
  createdAt: string;
  updatedAt: string;
};

export type ProfileFilters = {
  gender: Gender;
  birthYearValue: string;
  birthYearComparison: NumericComparison;
  heightValue: string;
  heightComparison: NumericComparison;
  activeOnly: boolean;
  religion: Religion | '';
  smoking: Smoking | '';
  query: string;
};

export type Gender = 'male' | 'female';
export type ProfileStatus = 'active' | 'blocked';
export type Religion = 'christian' | 'buddhist' | 'catholic' | 'none' | 'not_selected';
export type Smoking = 'smoker' | 'non_smoker' | 'not_selected';
export type Drinking = 'drinker' | 'non_drinker' | 'not_selected';

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
  authorName: string;
  residence: string;
  age: number;
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
  minAge: number;
  maxAge: number;
  minHeight: number;
  maxHeight: number;
  religions: Religion[];
  smoking: Smoking[];
  query: string;
};

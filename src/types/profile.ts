export type Gender = 'male' | 'female';
export type ProfileStatus = 'active' | 'blocked';
export type Religion = 'christian' | 'buddhist' | 'catholic' | 'none' | 'not_selected';
export type Smoking = 'smoker' | 'non_smoker' | 'not_selected';
export type Drinking = 'drinker' | 'non_drinker' | 'not_selected';

// 관리자 전용(주선자만 보는) 항목. 미선택 기본값을 허용한다(버튼 재클릭 해제).
export type Probe = 'possible' | 'impossible' | 'not_selected';
export type RejectionTolerance = 'high' | 'mid' | 'low' | 'not_selected';
export type ResponseSpeed = 'fast' | 'normal' | 'slow' | 'not_selected';
export type NumericComparison = 'gte' | 'lte';
export type SortField = 'default' | 'age' | 'height' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

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
  starredByName: string | null;
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
  adminMemo: string;
  // 관리자 전용 항목(공유 화면에는 노출하지 않음)
  probe: Probe;
  rejectionTolerance: RejectionTolerance;
  responseSpeed: ResponseSpeed;
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
  sortField: SortField;
  sortDirection: SortDirection;
};

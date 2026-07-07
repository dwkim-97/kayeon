import type {
  Drinking,
  Gender,
  Probe,
  RejectionTolerance,
  Religion,
  ResponseSpeed,
  Smoking,
} from '@/types/profile';

export const genderLabels: Record<Gender, string> = {
  female: '여성',
  male: '남성',
};

export const religionLabels: Record<Religion, string> = {
  christian: '기독교',
  buddhist: '불교',
  catholic: '천주교',
  none: '무교',
  not_selected: '미선택',
};

export const smokingLabels: Record<Smoking, string> = {
  smoker: '흡연',
  non_smoker: '비흡연',
  not_selected: '미선택',
};

export const drinkingLabels: Record<Drinking, string> = {
  drinker: '마심',
  non_drinker: '마시지 않음',
  not_selected: '미선택',
};

// 관리자 전용 항목 라벨
export const probeLabels: Record<Probe, string> = {
  possible: '떠보기 가능',
  impossible: '떠보기 불가능',
  not_selected: '미선택',
};

export const rejectionToleranceLabels: Record<RejectionTolerance, string> = {
  high: '상',
  mid: '중',
  low: '하',
  not_selected: '미선택',
};

export const responseSpeedLabels: Record<ResponseSpeed, string> = {
  fast: '빠름',
  normal: '보통',
  slow: '느림',
  not_selected: '미선택',
};

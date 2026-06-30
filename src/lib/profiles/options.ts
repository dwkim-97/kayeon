import type {Drinking, Gender, Religion, Smoking} from '@/types/profile';

export const genderLabels: Record<Gender, string> = {
  female: '여성',
  male: '남성',
};

export const religionLabels: Record<Religion, string> = {
  christian: '기독교',
  buddhist: '불교',
  catholic: '천주교',
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

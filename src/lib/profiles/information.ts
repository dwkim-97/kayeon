import {formatBirthYearLabel} from '@/lib/profiles/age';
import {drinkingLabels, religionLabels, smokingLabels} from '@/lib/profiles/options';
import type {Profile} from '@/types/profile';

export type ProfileInformationRow = [label: string, value: string];

// 주요 정보 = 나이 / 키 / 사는 곳 / 회사. 카드에 표시되고 폼의 주요 섹션을 구성한다.
export const PRIMARY_INFO_LABELS = ['나이', '키', '사는 곳', '회사'] as const;

export function getPrimaryInformationRows(profile: Profile): ProfileInformationRow[] {
  return [
    ['나이', formatBirthYearLabel(profile.birthYear)],
    ['키', `${profile.height}cm`],
    ['사는 곳', profile.residence],
    ['회사', profile.job],
  ];
}

export function getAdditionalInformationRows(profile: Profile): ProfileInformationRow[] {
  const rows: ProfileInformationRow[] = [];

  if (profile.religion !== 'not_selected') rows.push(['종교', religionLabels[profile.religion]]);

  if (profile.mbti) rows.push(['MBTI', profile.mbti]);
  if (profile.hobbies) rows.push(['취미', profile.hobbies]);

  const hasSmokingInfo = profile.smoking !== 'not_selected';
  const hasDrinkingInfo = profile.drinking !== 'not_selected';
  if (hasSmokingInfo || hasDrinkingInfo) {
    const value =
      hasSmokingInfo && hasDrinkingInfo
        ? `${smokingLabels[profile.smoking]} / ${drinkingLabels[profile.drinking]}`
        : hasSmokingInfo
          ? smokingLabels[profile.smoking]
          : drinkingLabels[profile.drinking];
    rows.push(['흡연/음주', value]);
  }

  if (profile.idealType) rows.push(['이상형', profile.idealType]);
  if (profile.matchmakerComment) rows.push(['코멘트', profile.matchmakerComment]);
  if (profile.extra) rows.push(['기타', profile.extra]);

  return rows;
}

// 주요 + 추가를 합친 전체 정보. 공개 상세페이지·상세 모달에서 사용.
export function getProfileInformationRows(profile: Profile): ProfileInformationRow[] {
  return [...getPrimaryInformationRows(profile), ...getAdditionalInformationRows(profile)];
}

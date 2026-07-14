import {formatBirthYearLabel} from '@/lib/profiles/age';
import {
  drinkingLabels,
  probeLabels,
  rejectionToleranceLabels,
  religionLabels,
  responseSpeedLabels,
  smokingLabels,
} from '@/lib/profiles/options';
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

type InformationOptions = {
  // 공유·공개용 페이지에서는 이상형·주선자 코멘트를 노출하지 않는다.
  hidePrivateNotes?: boolean;
};

export function getAdditionalInformationRows(
  profile: Profile,
  options: InformationOptions = {},
): ProfileInformationRow[] {
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

  if (!options.hidePrivateNotes) {
    if (profile.idealType) rows.push(['이상형', profile.idealType]);
    if (profile.matchmakerComment) rows.push(['주선자 코멘트', profile.matchmakerComment]);
  }
  if (profile.extra) rows.push(['기타', profile.extra]);

  return rows;
}

// 주요 + 추가를 합친 전체 정보. 공개 상세페이지·상세 모달에서 사용.
export function getProfileInformationRows(
  profile: Profile,
  options: InformationOptions = {},
): ProfileInformationRow[] {
  return [...getPrimaryInformationRows(profile), ...getAdditionalInformationRows(profile, options)];
}

// 관리자 전용 항목(떠보기/거절내성/응답속도). 주선자만 보는 상세 모달에서만 노출.
// 미선택 항목은 제외한다.
export function getAdminInformationRows(profile: Profile): ProfileInformationRow[] {
  const rows: ProfileInformationRow[] = [];
  if (profile.probe !== 'not_selected') rows.push(['떠보기', probeLabels[profile.probe]]);
  if (profile.rejectionTolerance !== 'not_selected') {
    rows.push(['거절내성', rejectionToleranceLabels[profile.rejectionTolerance]]);
  }
  if (profile.responseSpeed !== 'not_selected') {
    rows.push(['응답속도', responseSpeedLabels[profile.responseSpeed]]);
  }
  if (profile.reward.trim()) rows.push(['리워드', profile.reward.trim()]);
  return rows;
}

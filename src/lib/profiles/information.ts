import {formatBirthYearLabel} from '@/lib/profiles/age';
import {drinkingLabels, religionLabels, smokingLabels} from '@/lib/profiles/options';
import type {Profile} from '@/types/profile';

export type ProfileInformationRow = [label: string, value: string];

export function getProfileInformationRows(profile: Profile): ProfileInformationRow[] {
  const rows: ProfileInformationRow[] = [
    ['나이', formatBirthYearLabel(profile.birthYear)],
    ['키', `${profile.height}cm`],
    ['사는 곳', profile.residence],
    ['회사', profile.job],
  ];

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

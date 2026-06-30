import {formatBirthYearLabel} from '@/lib/profiles/age';
import {drinkingLabels, religionLabels, smokingLabels} from '@/lib/profiles/options';
import type {Profile} from '@/types/profile';

export type ProfileInformationRow = [label: string, value: string];

export function getProfileInformationRows(profile: Profile): ProfileInformationRow[] {
  return [
    ['나이', formatBirthYearLabel(profile.birthYear)],
    ['키', `${profile.height}cm`],
    ['사는 곳', profile.residence],
    ['회사', profile.job],
    ['종교', religionLabels[profile.religion]],
    ['MBTI', profile.mbti || '미입력'],
    ['취미', profile.hobbies || '미입력'],
    ['흡연/음주', `${smokingLabels[profile.smoking]} / ${drinkingLabels[profile.drinking]}`],
    ['이상형', profile.idealType || '미입력'],
    ['코멘트', profile.matchmakerComment || '미입력'],
  ];
}

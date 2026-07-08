import {formatBirthYearLabel} from '@/lib/profiles/age';
import {getProfileInformationRows} from '@/lib/profiles/information';
import type {Profile} from '@/types/profile';

// 카카오톡 등에 붙여넣을 매물 정보 텍스트를 만든다.
// 주요+추가 정보만 포함하고(관리자 메모/관리자 전용 항목 제외),
// 사진과 함께 사람이 직접 친 것처럼 보이도록 줄 단위로 구성한다.
export function buildShareText(profile: Profile): string {
  const header = formatBirthYearLabel(profile.birthYear);
  const lines = getProfileInformationRows(profile).map(([label, value]) => `${label}: ${value}`);
  return [header, ...lines].join('\n');
}

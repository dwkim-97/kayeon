import {formatBirthYearLabel} from '@/lib/profiles/age';
import {getProfileInformationRows} from '@/lib/profiles/information';
import type {Profile} from '@/types/profile';

// 공유 텍스트에서 제외할 라벨.
// - '나이': 첫 줄이 이미 년생이라 중복
// - '이상형': 기존 공유(카톡/공개페이지)와 동일하게 노출하지 않음
const EXCLUDED_SHARE_LABELS = ['나이', '이상형'];

// 카카오톡 등에 붙여넣을 매물 정보 텍스트를 만든다.
// 주요+추가 정보만 포함하고(관리자 메모/관리자 전용 항목·이상형 제외),
// 사진과 함께 사람이 직접 친 것처럼 보이도록 줄 단위로 구성한다.
export function buildShareText(profile: Profile): string {
  const header = formatBirthYearLabel(profile.birthYear);
  const lines = getProfileInformationRows(profile)
    .filter(([label]) => !EXCLUDED_SHARE_LABELS.includes(label))
    .map(([label, value]) => `${label}: ${value}`);
  return [header, ...lines].join('\n');
}

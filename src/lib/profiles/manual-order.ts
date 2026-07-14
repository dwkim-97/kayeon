import type {Profile} from '@/types/profile';

// 편집모드 드래그 순서 저장용 가중치 계산.
// 이동 대상 1개만 새 weight를 받는다(이웃의 midpoint). 작을수록 위.
// list: 현재 표시 순서(정렬 반영된 성별별 목록). fromIndex→toIndex로 옮긴다.
export function computeDroppedWeight(list: Profile[], fromIndex: number, toIndex: number): number {
  // 이동 대상을 뺀 나머지 배열에서 삽입 위치의 앞/뒤 이웃 weight를 본다.
  const without = list.filter((_, i) => i !== fromIndex);
  const prev = without[toIndex - 1];
  const next = without[toIndex];

  if (!prev) return (next ? next.manualOrderWeight : 0) - 1; // 맨 위
  if (!next) return prev.manualOrderWeight + 1; // 맨 아래
  return (prev.manualOrderWeight + next.manualOrderWeight) / 2; // 사이
}

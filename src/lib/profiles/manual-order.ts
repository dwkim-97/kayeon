import {arrayMove} from '@dnd-kit/sortable';

import type {Profile} from '@/types/profile';

// 편집모드 드래그 순서 저장. 표시 순서(list)에서 fromIndex→toIndex로 옮긴 뒤
// 전체에 0,1,2,… 순번 가중치를 재부여하고, 실제로 바뀐 행만 반환한다.
// (기존 매물이 전부 weight 0이라 midpoint 방식이 안 먹히던 문제를 해결)
// 판정 기준: 프로필이 물리적으로 다른 위치로 이동했거나(originalIndex !== newIndex)
// 새 가중치(newIndex)가 기존 가중치와 다른 경우(manualOrderWeight !== newIndex).
export function reorderWeights(
  list: Profile[],
  fromIndex: number,
  toIndex: number,
): {id: string; manualOrderWeight: number}[] {
  const originalIndexById = new Map(list.map((p, i) => [p.id, i]));
  const reordered = arrayMove(list, fromIndex, toIndex);
  const changed: {id: string; manualOrderWeight: number}[] = [];
  reordered.forEach((profile, index) => {
    const movedPosition = originalIndexById.get(profile.id) !== index;
    const weightChanged = profile.manualOrderWeight !== index;
    if (movedPosition || weightChanged) {
      changed.push({id: profile.id, manualOrderWeight: index});
    }
  });
  return changed;
}

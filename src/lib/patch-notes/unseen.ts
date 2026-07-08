import type {PatchNote} from './data';

// "안 읽은 패치노트" 감지 로직.
// 목록의 가장 최신 패치 날짜를 "현재 버전"으로 보고,
// localStorage에 저장된 "마지막으로 확인한 날짜"와 다르면 안 읽은 것으로 판단한다.
// 최초 방문(저장값 없음)에도 새 패치로 알려 존재를 인지시킨다.

export const PATCH_NOTES_SEEN_STORAGE_KEY = 'kayeon_patch_notes_seen';

// 목록에서 가장 최신 패치의 날짜(정렬 순서에 의존하지 않고 최대값을 고른다). 없으면 null.
export function latestPatchDate(notes: PatchNote[]): string | null {
  let latest: string | null = null;
  for (const note of notes) {
    if (latest === null || note.date > latest) latest = note.date;
  }
  return latest;
}

// 안 읽은 패치가 있는지. 패치가 하나도 없으면 false.
export function hasUnseenPatchNotes(notes: PatchNote[], lastSeenDate: string | null): boolean {
  const latest = latestPatchDate(notes);
  if (latest === null) return false;
  return lastSeenDate !== latest;
}

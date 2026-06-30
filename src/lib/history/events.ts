import type {HistoryEventType, ProfileEventType} from '@/types/history';

export function recordHistory(params: {
  type: HistoryEventType;
  actorName: string;
  targetLabel: string;
  description: string;
}) {
  fetch('/api/history', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(params),
  }).catch(console.error);
}

export const historyEventLabels: Record<HistoryEventType, string> = {
  profile_created: '매물 추가',
  profile_updated: '매물 수정',
  profile_deleted: '매물 삭제',
  profile_blocked: '매물 차단',
  profile_activated: '매물 활성화',
  admin_created: '관리자 추가',
  admin_removed: '관리자 제거',
};

export const historyEventDescriptions: Record<ProfileEventType, string> = {
  profile_created: '매물 정보를 추가했습니다.',
  profile_updated: '매물 정보를 수정했습니다.',
  profile_deleted: '매물 정보를 삭제했습니다.',
  profile_blocked: '매물 정보를 blocked 상태로 변경했습니다.',
  profile_activated: '매물 정보를 active 상태로 변경했습니다.',
};


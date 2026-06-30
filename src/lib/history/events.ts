import type {HistoryEvent, HistoryEventType} from '@/types/history';

export const historyEventLabels: Record<HistoryEventType, string> = {
  profile_created: '매물 추가',
  profile_updated: '매물 수정',
  profile_deleted: '매물 삭제',
  profile_blocked: '매물 차단',
  profile_activated: '매물 활성화',
  admin_created: '관리자 추가',
  admin_removed: '관리자 제거',
};

export type CreateHistoryEventInput = {
  id: string;
  type: HistoryEventType;
  actorName: string;
  targetLabel: string;
  description: string;
  createdAt: string;
};

export function createHistoryEvent(input: CreateHistoryEventInput): HistoryEvent {
  return {
    id: input.id,
    type: input.type,
    actorName: input.actorName.trim(),
    targetLabel: input.targetLabel.trim(),
    description: input.description.trim(),
    createdAt: input.createdAt,
  };
}

export type ProfileEventType =
  | 'profile_created'
  | 'profile_updated'
  | 'profile_deleted'
  | 'profile_blocked'
  | 'profile_activated';

export type HistoryEventType =
  | ProfileEventType
  | 'admin_created'
  | 'admin_removed'
  | 'match_created'
  | 'match_ended';

export type HistoryEvent = {
  id: string;
  type: HistoryEventType;
  actorName: string;
  targetLabel: string;
  description: string;
  createdAt: string;
};

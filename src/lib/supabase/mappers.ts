import type {HistoryEvent} from '@/types/history';
import type {Match} from '@/types/match';
import type {Profile, ProfilePhoto} from '@/types/profile';

import type {Database} from './types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfilePhotoRow = Database['public']['Tables']['profile_photos']['Row'];
type HistoryEventRow = Database['public']['Tables']['history_events']['Row'];
type MatchRow = Database['public']['Tables']['matches']['Row'];

export function rowToMatch(row: MatchRow): Match {
  return {
    id: row.id,
    femaleId: row.female_id,
    maleId: row.male_id,
    status: row.status,
    memo: row.memo,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    endedAt: row.ended_at,
  };
}

export function rowToProfile(row: ProfileRow, photoRows: ProfilePhotoRow[], publicUrlBase: string): Profile {
  const photos: ProfilePhoto[] = [...photoRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(photo => ({
      id: photo.id,
      url: `${publicUrlBase}/${photo.storage_path}`,
      alt: photo.alt,
      order: photo.sort_order,
    }));

  return {
    id: row.id,
    gender: row.gender,
    status: row.status,
    isActivated: row.status === 'active',
    authorName: row.author_name,
    starredByName: row.starred_by_name ?? null,
    residence: row.residence,
    birthYear: row.birth_year,
    height: row.height,
    job: row.job,
    religion: row.religion,
    mbti: row.mbti,
    hobbies: row.hobbies,
    smoking: row.smoking,
    drinking: row.drinking,
    idealType: row.ideal_type,
    matchmakerComment: row.matchmaker_comment,
    extra: row.extra,
    adminMemo: row.admin_memo ?? '',
    // 관리자 전용 항목 — DB 컬럼 미적용 환경 방어(?? 'not_selected')
    probe: row.probe ?? 'not_selected',
    rejectionTolerance: row.rejection_tolerance ?? 'not_selected',
    responseSpeed: row.response_speed ?? 'not_selected',
    reward: row.reward ?? '',
    manualOrderWeight: row.manual_order_weight ?? 0,
    photos,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToHistoryEvent(row: HistoryEventRow): HistoryEvent {
  return {
    id: row.id,
    type: row.type,
    actorName: row.actor_name,
    targetLabel: row.target_label,
    description: row.description,
    createdAt: row.created_at,
  };
}

export function profileToInsertRow(
  profile: Omit<Profile, 'photos' | 'createdAt' | 'updatedAt'>,
): Database['public']['Tables']['profiles']['Insert'] {
  return {
    id: profile.id,
    gender: profile.gender,
    status: profile.status,
    author_name: profile.authorName,
    residence: profile.residence,
    birth_year: profile.birthYear,
    height: profile.height,
    job: profile.job,
    religion: profile.religion,
    mbti: profile.mbti,
    hobbies: profile.hobbies,
    smoking: profile.smoking,
    drinking: profile.drinking,
    ideal_type: profile.idealType,
    matchmaker_comment: profile.matchmakerComment,
    extra: profile.extra,
    admin_memo: profile.adminMemo,
    probe: profile.probe,
    rejection_tolerance: profile.rejectionTolerance,
    response_speed: profile.responseSpeed,
    reward: profile.reward,
    manual_order_weight: profile.manualOrderWeight,
  };
}

type UpdateRow = Database['public']['Tables']['profiles']['Update'];
// updated_at is owned by the profiles_set_updated_at DB trigger; do not set it here.
// id is the PK used in the .eq() filter; it must not appear in the SET clause.
export type UpdatableProfile = Partial<Omit<Profile, 'id' | 'photos' | 'createdAt' | 'updatedAt' | 'authorName' | 'isActivated'>>;

const profileFieldMap: [keyof UpdatableProfile, keyof UpdateRow][] = [
  ['gender', 'gender'],
  ['status', 'status'],
  ['residence', 'residence'],
  ['birthYear', 'birth_year'],
  ['height', 'height'],
  ['job', 'job'],
  ['religion', 'religion'],
  ['mbti', 'mbti'],
  ['hobbies', 'hobbies'],
  ['smoking', 'smoking'],
  ['drinking', 'drinking'],
  ['idealType', 'ideal_type'],
  ['matchmakerComment', 'matchmaker_comment'],
  ['extra', 'extra'],
  ['adminMemo', 'admin_memo'],
  ['probe', 'probe'],
  ['rejectionTolerance', 'rejection_tolerance'],
  ['responseSpeed', 'response_speed'],
  ['reward', 'reward'],
  ['manualOrderWeight', 'manual_order_weight'],
  ['starredByName', 'starred_by_name'],
];

export function profileToUpdateRow(profile: UpdatableProfile): UpdateRow {
  const row: UpdateRow = {};
  for (const [src, dest] of profileFieldMap) {
    if (profile[src] !== undefined) (row as Record<string, unknown>)[dest] = profile[src];
  }
  return row;
}

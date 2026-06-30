import type {HistoryEvent} from '@/types/history';
import type {Profile, ProfilePhoto} from '@/types/profile';

import type {Database} from './types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfilePhotoRow = Database['public']['Tables']['profile_photos']['Row'];
type HistoryEventRow = Database['public']['Tables']['history_events']['Row'];

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
];

export function profileToUpdateRow(profile: UpdatableProfile): UpdateRow {
  const row: UpdateRow = {};
  for (const [src, dest] of profileFieldMap) {
    if (profile[src] !== undefined) (row as Record<string, unknown>)[dest] = profile[src];
  }
  return row;
}

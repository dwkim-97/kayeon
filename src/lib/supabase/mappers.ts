import type {HistoryEvent, HistoryEventType} from '@/types/history';
import type {Profile, ProfilePhoto} from '@/types/profile';

import type {Database} from './types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfilePhotoRow = Database['public']['Tables']['profile_photos']['Row'];
type HistoryEventRow = Database['public']['Tables']['history_events']['Row'];

export function rowToProfile(row: ProfileRow, photoRows: ProfilePhotoRow[], publicUrlBase: string): Profile {
  const photos: ProfilePhoto[] = photoRows
    .sort((a, b) => a.order - b.order)
    .map(photo => ({
      id: photo.id,
      url: `${publicUrlBase}/${photo.storage_path}`,
      alt: photo.alt,
      order: photo.order,
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
    type: row.type as HistoryEventType,
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

export function profileToUpdateRow(
  profile: Partial<Omit<Profile, 'photos' | 'createdAt' | 'authorName' | 'isActivated'>>,
): Database['public']['Tables']['profiles']['Update'] {
  const row: Database['public']['Tables']['profiles']['Update'] = {};

  if (profile.gender !== undefined) row.gender = profile.gender;
  if (profile.status !== undefined) row.status = profile.status;
  if (profile.residence !== undefined) row.residence = profile.residence;
  if (profile.birthYear !== undefined) row.birth_year = profile.birthYear;
  if (profile.height !== undefined) row.height = profile.height;
  if (profile.job !== undefined) row.job = profile.job;
  if (profile.religion !== undefined) row.religion = profile.religion;
  if (profile.mbti !== undefined) row.mbti = profile.mbti;
  if (profile.hobbies !== undefined) row.hobbies = profile.hobbies;
  if (profile.smoking !== undefined) row.smoking = profile.smoking;
  if (profile.drinking !== undefined) row.drinking = profile.drinking;
  if (profile.idealType !== undefined) row.ideal_type = profile.idealType;
  if (profile.matchmakerComment !== undefined) row.matchmaker_comment = profile.matchmakerComment;
  if (profile.extra !== undefined) row.extra = profile.extra;

  row.updated_at = new Date().toISOString();

  return row;
}

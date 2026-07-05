import type {PendingProfile} from '@/types/pending';

import type {Database} from './types';

type PendingRow = Database['public']['Tables']['pending_profiles']['Row'];

export function rowToPendingProfile(row: PendingRow, publicUrlBase: string): PendingProfile {
  return {
    id: row.id,
    gender: row.gender,
    birthYear: row.birth_year,
    height: row.height,
    residence: row.residence,
    job: row.job,
    religion: row.religion,
    mbti: row.mbti,
    hobbies: row.hobbies,
    smoking: row.smoking,
    drinking: row.drinking,
    idealType: row.ideal_type,
    matchmakerComment: row.matchmaker_comment,
    extra: row.extra,
    photoUrls: row.photo_paths.map(p => `${publicUrlBase}/${p}`),
    submittedBy: row.submitted_by,
    createdAt: row.created_at,
  };
}

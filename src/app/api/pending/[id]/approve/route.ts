import {NextResponse} from 'next/server';

import {getSessionUserName} from '@/lib/auth/session';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {createSupabaseServerClient, PROFILE_PHOTOS_BUCKET} from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteParams = {params: Promise<{id: string}>};

export async function POST(_request: Request, {params}: RouteParams) {
  const {id} = await params;
  const session = await createSupabaseServerClient();
  const actorName = await getSessionUserName(session);
  if (!actorName) return NextResponse.json({message: '인증이 필요합니다.'}, {status: 401});

  const admin = createSupabaseAdminClient();

  // 1) pending 조회
  const {data: pending, error: fetchError} = await admin
    .from('pending_profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError || !pending) {
    return NextResponse.json({message: '대기 매물을 찾을 수 없습니다.'}, {status: 404});
  }

  // 2) 프로필 생성
  const profileId = crypto.randomUUID();
  const {error: profileError} = await admin.from('profiles').insert({
    id: profileId,
    gender: pending.gender,
    status: 'active',
    author_name: actorName,
    residence: pending.residence,
    birth_year: pending.birth_year,
    height: pending.height,
    job: pending.job,
    religion: pending.religion,
    mbti: pending.mbti,
    hobbies: pending.hobbies,
    smoking: pending.smoking,
    drinking: pending.drinking,
    ideal_type: pending.ideal_type,
    matchmaker_comment: pending.matchmaker_comment,
    extra: pending.extra,
  });
  if (profileError) return NextResponse.json({message: profileError.message}, {status: 500});

  // 3) 사진 정식 경로로 복사 + profile_photos insert
  const photoRows: {id: string; profile_id: string; storage_path: string; alt: string; sort_order: number}[] = [];
  for (const [i, srcPath] of pending.photo_paths.entries()) {
    const ext = srcPath.split('.').pop() ?? 'jpg';
    const photoId = crypto.randomUUID();
    const destPath = `${profileId}/${photoId}.${ext}`;
    const {error: copyError} = await admin.storage.from(PROFILE_PHOTOS_BUCKET).copy(srcPath, destPath);
    if (copyError) return NextResponse.json({message: `사진 복사 실패: ${copyError.message}`}, {status: 500});
    photoRows.push({id: photoId, profile_id: profileId, storage_path: destPath, alt: `프로필 사진 ${i + 1}`, sort_order: i});
  }
  if (photoRows.length > 0) {
    const {error: photoError} = await admin.from('profile_photos').insert(photoRows);
    if (photoError) return NextResponse.json({message: photoError.message}, {status: 500});
  }

  // 4) pending 사진 + 행 삭제
  if (pending.photo_paths.length > 0) {
    await admin.storage.from(PROFILE_PHOTOS_BUCKET).remove(pending.photo_paths);
  }
  await admin.from('pending_profiles').delete().eq('id', id);

  return NextResponse.json({profileId});
}

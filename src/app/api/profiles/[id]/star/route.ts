import {NextResponse} from 'next/server';

import {getSessionUserName} from '@/lib/auth/session';
import {rowToProfile} from '@/lib/supabase/mappers';
import {createSupabaseServerClient, getStoragePublicBase} from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MAX_STARS_PER_GENDER = 2;

type RouteParams = {params: Promise<{id: string}>};

export async function POST(_request: Request, {params}: RouteParams) {
  const {id} = await params;
  const supabase = await createSupabaseServerClient();
  const actorName = await getSessionUserName(supabase);

  if (!actorName) {
    return NextResponse.json({message: '인증이 필요합니다.'}, {status: 401});
  }

  // 대상 프로필 조회
  const {data: target, error: fetchError} = await supabase
    .from('profiles')
    .select('id, gender, starred_by_name, status')
    .eq('id', id)
    .single();

  if (fetchError || !target) {
    return NextResponse.json({message: '매물을 찾을 수 없습니다.'}, {status: 404});
  }

  // 이미 다른 author가 별표한 경우 선점 불가
  if (target.starred_by_name && target.starred_by_name !== actorName) {
    return NextResponse.json({
      message: `이미 ${target.starred_by_name}님이 집착매물로 지정한 매물입니다.`,
    }, {status: 409});
  }

  // 이미 본인이 별표한 경우 무시
  if (target.starred_by_name === actorName) {
    return NextResponse.json({message: '이미 집착매물로 지정되어 있습니다.'}, {status: 409});
  }

  // 동일 author + 동일 성별의 현재 별표 수 확인
  const {count, error: countError} = await supabase
    .from('profiles')
    .select('id', {count: 'exact', head: true})
    .eq('starred_by_name', actorName)
    .eq('gender', target.gender);

  if (countError) {
    return NextResponse.json({message: countError.message}, {status: 500});
  }

  if ((count ?? 0) >= MAX_STARS_PER_GENDER) {
    return NextResponse.json({
      message: `${target.gender === 'female' ? '여성' : '남성'} 매물은 최대 ${MAX_STARS_PER_GENDER}명까지 집착매물로 지정할 수 있습니다.`,
      code: 'STAR_LIMIT_EXCEEDED',
    }, {status: 400});
  }

  // 별표 추가
  const {data: updated, error: updateError} = await supabase
    .from('profiles')
    .update({starred_by_name: actorName})
    .eq('id', id)
    .select('*, profile_photos(*)')
    .single();

  if (updateError) {
    return NextResponse.json({message: updateError.message}, {status: 500});
  }

  const {profile_photos: photoRows, ...row} = updated;
  const profile = rowToProfile(row, photoRows ?? [], getStoragePublicBase());
  return NextResponse.json({profile});
}

export async function DELETE(_request: Request, {params}: RouteParams) {
  const {id} = await params;
  const supabase = await createSupabaseServerClient();
  const actorName = await getSessionUserName(supabase);

  if (!actorName) {
    return NextResponse.json({message: '인증이 필요합니다.'}, {status: 401});
  }

  const {data: target, error: fetchError} = await supabase
    .from('profiles')
    .select('id, starred_by_name')
    .eq('id', id)
    .single();

  if (fetchError || !target) {
    return NextResponse.json({message: '매물을 찾을 수 없습니다.'}, {status: 404});
  }

  if (target.starred_by_name !== actorName) {
    return NextResponse.json({message: '본인이 지정한 집착매물만 해제할 수 있습니다.'}, {status: 403});
  }

  const {data: updated, error: updateError} = await supabase
    .from('profiles')
    .update({starred_by_name: null})
    .eq('id', id)
    .select('*, profile_photos(*)')
    .single();

  if (updateError) {
    return NextResponse.json({message: updateError.message}, {status: 500});
  }

  const {profile_photos: photoRows, ...row} = updated;
  const profile = rowToProfile(row, photoRows ?? [], getStoragePublicBase());
  return NextResponse.json({profile});
}

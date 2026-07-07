import {NextResponse} from 'next/server';

import {getSessionUserName} from '@/lib/auth/session';
import {isMissingColumnError, stripAdminColumns} from '@/lib/supabase/admin-columns';
import {profileToInsertRow, rowToProfile} from '@/lib/supabase/mappers';
import {createSupabaseServerClient, getStoragePublicBase} from '@/lib/supabase/server';
import type {Profile} from '@/types/profile';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {data, error} = await supabase
    .from('profiles')
    .select('*, profile_photos(*)')
    .order('created_at', {ascending: false});

  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }

  const publicBase = getStoragePublicBase();
  const profiles = data.map(({profile_photos: photoRows, ...row}) =>
    rowToProfile(row, photoRows ?? [], publicBase),
  );

  return NextResponse.json({profiles});
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const [actorName, body] = await Promise.all([
    getSessionUserName(supabase),
    request.json() as Promise<Omit<Profile, 'createdAt' | 'updatedAt'>>,
  ]);

  const insertRow = profileToInsertRow({...body, authorName: actorName});

  let {data: profileRow, error} = await supabase.from('profiles').insert(insertRow).select().single();

  // 관리자 전용 컬럼이 아직 DB에 없으면 그 컬럼들을 빼고 재시도(등록이 깨지지 않게).
  if (error && isMissingColumnError(error)) {
    ({data: profileRow, error} = await supabase
      .from('profiles')
      .insert(stripAdminColumns(insertRow))
      .select()
      .single());
  }

  if (error || !profileRow) {
    return NextResponse.json({message: error?.message ?? '매물을 등록하지 못했습니다.'}, {status: 500});
  }

  const profile = rowToProfile(profileRow, [], getStoragePublicBase());

  return NextResponse.json({profile}, {status: 201});
}

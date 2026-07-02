import {NextResponse} from 'next/server';

import {getSessionUserName} from '@/lib/auth/session';
import {rowToMatch} from '@/lib/supabase/mappers';
import {createSupabaseServerClient} from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const profileId = new URL(request.url).searchParams.get('profileId');

  let query = supabase.from('matches').select('*').order('created_at', {ascending: false});
  if (profileId) query = query.or(`female_id.eq.${profileId},male_id.eq.${profileId}`);

  const {data, error} = await query;
  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }
  return NextResponse.json({matches: data.map(rowToMatch)});
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const actorName = await getSessionUserName(supabase);
  if (!actorName) {
    return NextResponse.json({message: '인증이 필요합니다.'}, {status: 401});
  }

  const {femaleId, maleId} = (await request.json()) as {femaleId: string; maleId: string};
  if (!femaleId || !maleId) {
    return NextResponse.json({message: '여성/남성 매물을 모두 선택해 주세요.'}, {status: 400});
  }

  const {data, error} = await supabase
    .from('matches')
    .insert({female_id: femaleId, male_id: maleId, created_by_name: actorName})
    .select('*')
    .single();

  if (error) {
    const isDup = error.code === '23505';
    return NextResponse.json(
      {message: isDup ? '이미 진행중인 매칭입니다.' : error.message},
      {status: isDup ? 409 : 500},
    );
  }
  return NextResponse.json({match: rowToMatch(data)}, {status: 201});
}

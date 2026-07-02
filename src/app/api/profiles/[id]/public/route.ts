import {NextResponse} from 'next/server';

import {rowToProfile} from '@/lib/supabase/mappers';
import {createSupabasePublicClient, getStoragePublicBase} from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteParams = {params: Promise<{id: string}>};

export async function GET(_request: Request, {params}: RouteParams) {
  const {id} = await params;
  const supabase = createSupabasePublicClient();

  const {data, error} = await supabase
    .from('profiles')
    .select('*, profile_photos(*)')
    .eq('id', id)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return NextResponse.json({message: '매물을 찾을 수 없습니다.'}, {status: 404});
  }

  const {profile_photos: photoRows, ...row} = data;
  const profile = rowToProfile(row, photoRows ?? [], getStoragePublicBase());

  return NextResponse.json({profile});
}

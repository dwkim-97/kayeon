import {NextResponse} from 'next/server';

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
  const [{data: {user}}, body] = await Promise.all([
    supabase.auth.getUser(),
    request.json() as Promise<Omit<Profile, 'createdAt' | 'updatedAt'>>,
  ]);
  const actorName = (user?.user_metadata?.name as string | undefined) ?? '';

  const insertRow = profileToInsertRow({...body, authorName: actorName});

  const {data: profileRow, error} = await supabase.from('profiles').insert(insertRow).select().single();

  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }

  const profile = rowToProfile(profileRow, [], getStoragePublicBase());

  return NextResponse.json({profile}, {status: 201});
}

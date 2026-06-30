import {NextResponse} from 'next/server';

import {getSessionUserName} from '@/lib/auth/session';
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
    getSessionUserName(),
    request.json() as Promise<Omit<Profile, 'createdAt' | 'updatedAt'>>,
  ]);

  const insertRow = profileToInsertRow({...body, authorName: actorName});

  const {data: profileRow, error} = await supabase.from('profiles').insert(insertRow).select().single();

  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }

  const profile = rowToProfile(profileRow, [], getStoragePublicBase());

  return NextResponse.json({profile}, {status: 201});
}

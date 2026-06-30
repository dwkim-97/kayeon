import {NextResponse} from 'next/server';

import {getSessionUserName} from '@/lib/auth/session';
import {profileToInsertRow, rowToProfile} from '@/lib/supabase/mappers';
import {createSupabaseServerClient, getStoragePublicBase} from '@/lib/supabase/server';
import type {Profile} from '@/types/profile';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const [profileResult, photoResult] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', {ascending: false}),
    supabase.from('profile_photos').select('*'),
  ]);

  if (profileResult.error) {
    return NextResponse.json({message: profileResult.error.message}, {status: 500});
  }

  if (photoResult.error) {
    return NextResponse.json({message: photoResult.error.message}, {status: 500});
  }

  const photosByProfile = new Map<string, typeof photoResult.data>();
  for (const photo of photoResult.data) {
    const bucket = photosByProfile.get(photo.profile_id) ?? [];
    bucket.push(photo);
    photosByProfile.set(photo.profile_id, bucket);
  }

  const publicBase = getStoragePublicBase();
  const profiles = profileResult.data.map(row =>
    rowToProfile(row, photosByProfile.get(row.id) ?? [], publicBase),
  );

  return NextResponse.json({profiles});
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const actorName = await getSessionUserName();
  const body = (await request.json()) as Omit<Profile, 'createdAt' | 'updatedAt'>;

  const insertRow = profileToInsertRow({...body, authorName: actorName});

  const {data: profileRow, error} = await supabase.from('profiles').insert(insertRow).select().single();

  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }

  const profile = rowToProfile(profileRow, [], getStoragePublicBase());

  return NextResponse.json({profile}, {status: 201});
}

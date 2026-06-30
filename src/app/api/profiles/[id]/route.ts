import {NextResponse} from 'next/server';

import {profileToUpdateRow, rowToProfile} from '@/lib/supabase/mappers';
import {createSupabaseServerClient, getStoragePublicBase} from '@/lib/supabase/server';
import type {Profile} from '@/types/profile';

export const runtime = 'nodejs';

type RouteParams = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: RouteParams) {
  const {id} = await params;
  const supabase = await createSupabaseServerClient();
  const body = (await request.json()) as Partial<Profile>;
  const updateRow = profileToUpdateRow(body);

  const {data: profileRow, error} = await supabase.from('profiles').update(updateRow).eq('id', id).select().single();

  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }

  const profile = rowToProfile(profileRow, [], getStoragePublicBase());

  return NextResponse.json({profile});
}

export async function DELETE(_request: Request, {params}: RouteParams) {
  const {id} = await params;
  const supabase = await createSupabaseServerClient();

  const {data: photoRows} = await supabase.from('profile_photos').select('storage_path').eq('profile_id', id);

  if (photoRows && photoRows.length > 0) {
    await supabase.storage
      .from('profile-photos')
      .remove(photoRows.map(photo => photo.storage_path));
  }

  const {error} = await supabase.from('profiles').delete().eq('id', id);

  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }

  return NextResponse.json({ok: true});
}

import {NextResponse} from 'next/server';

import {profileToUpdateRow, rowToProfile, type UpdatableProfile} from '@/lib/supabase/mappers';
import {createSupabaseServerClient, getStoragePublicBase, PROFILE_PHOTOS_BUCKET} from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteParams = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: RouteParams) {
  const {id} = await params;
  const supabase = await createSupabaseServerClient();
  const body = (await request.json()) as UpdatableProfile;
  const updateRow = profileToUpdateRow(body);

  const {data: profileRow, error} = await supabase
    .from('profiles')
    .update(updateRow)
    .eq('id', id)
    .select('*, profile_photos(*)')
    .single();

  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }

  const {profile_photos: photoRows, ...row} = profileRow;
  const profile = rowToProfile(row, photoRows ?? [], getStoragePublicBase());

  return NextResponse.json({profile});
}

export async function DELETE(_request: Request, {params}: RouteParams) {
  const {id} = await params;
  const supabase = await createSupabaseServerClient();

  // Fetch storage paths before deleting the profile so we can clean up storage.
  // Photo rows are removed automatically by the profile_photos ON DELETE CASCADE FK.
  const {data: photoRows} = await supabase.from('profile_photos').select('storage_path').eq('profile_id', id);

  const storagePaths = (photoRows ?? []).map(photo => photo.storage_path);

  if (storagePaths.length > 0) {
    await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove(storagePaths);
  }

  const {error} = await supabase.from('profiles').delete().eq('id', id);

  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }

  return NextResponse.json({ok: true});
}

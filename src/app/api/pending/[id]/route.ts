import {NextResponse} from 'next/server';

import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {PROFILE_PHOTOS_BUCKET} from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteParams = {params: Promise<{id: string}>};

export async function DELETE(_request: Request, {params}: RouteParams) {
  const {id} = await params;
  const admin = createSupabaseAdminClient();

  const {data: pending} = await admin.from('pending_profiles').select('photo_paths').eq('id', id).single();
  if (pending?.photo_paths?.length) {
    await admin.storage.from(PROFILE_PHOTOS_BUCKET).remove(pending.photo_paths);
  }
  const {error} = await admin.from('pending_profiles').delete().eq('id', id);
  if (error) return NextResponse.json({message: error.message}, {status: 500});
  return NextResponse.json({ok: true});
}

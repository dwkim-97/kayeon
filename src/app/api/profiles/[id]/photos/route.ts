import {NextResponse} from 'next/server';

import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {createSupabaseServerClient, PROFILE_PHOTOS_BUCKET} from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteParams = {params: Promise<{id: string}>};

// Step 1: client requests presigned upload URLs for new photos
// Returns: [{tempId, uploadUrl, storagePath}]
export async function POST(request: Request, {params}: RouteParams) {
  const {id: profileId} = await params;
  const supabase = await createSupabaseServerClient();

  const {photos}: {photos: {tempId: string; mimeType: string}[]} = await request.json();

  const signed = await Promise.all(
    photos.map(async photo => {
      const ext = photo.mimeType.split('/')[1] ?? 'jpg';
      const id = crypto.randomUUID();
      const storagePath = `${profileId}/${id}.${ext}`;

      const {data, error} = await supabase.storage
        .from(PROFILE_PHOTOS_BUCKET)
        .createSignedUploadUrl(storagePath);

      if (error) throw new Error(error.message);

      return {tempId: photo.tempId, uploadUrl: data.signedUrl, storagePath, id};
    }),
  );

  return NextResponse.json({signed});
}

// Step 2: client calls PUT after uploading files directly to storage
// Body: {newPhotos: [{tempId, storagePath, alt, order}], retainedPhotos: [{id, order}]}
export async function PUT(request: Request, {params}: RouteParams) {
  const {id: profileId} = await params;
  const supabase = await createSupabaseServerClient();

  const {
    newPhotos,
    retainedPhotos,
  }: {
    newPhotos: {tempId: string; id: string; storagePath: string; alt: string; order: number}[];
    retainedPhotos: {id: string; order: number}[];
  } = await request.json();

  const retainedIds = retainedPhotos.map(p => p.id);

  const {data: existingPhotos, error: fetchError} = await supabase
    .from('profile_photos')
    .select('id, storage_path')
    .eq('profile_id', profileId);

  if (fetchError) {
    return NextResponse.json({message: fetchError.message}, {status: 500});
  }

  const photosToDelete = (existingPhotos ?? []).filter(photo => !retainedIds.includes(photo.id));

  if (photosToDelete.length > 0) {
    const {error: storageError} = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .remove(photosToDelete.map(photo => photo.storage_path));

    if (storageError) {
      return NextResponse.json({message: storageError.message}, {status: 500});
    }

    const {error: deleteError} = await supabase
      .from('profile_photos')
      .delete()
      .in('id', photosToDelete.map(p => p.id));

    if (deleteError) {
      return NextResponse.json({message: deleteError.message}, {status: 500});
    }
  }

  // Update sort_order for retained photos (handles reordering).
  // Use admin client to bypass any RLS on profile_photos, and run sequentially
  // to avoid transient UNIQUE(profile_id, sort_order) collisions during swaps.
  if (retainedPhotos.length > 0) {
    const admin = createSupabaseAdminClient();

    // Step A: push all retained rows into a temporary "high" range so no two rows
    // in the target set share sort_order during the second pass. This defuses any
    // UNIQUE(profile_id, sort_order) constraint during the swap.
    for (let i = 0; i < retainedPhotos.length; i++) {
      const {id} = retainedPhotos[i];
      const {error} = await admin
        .from('profile_photos')
        .update({sort_order: 1000 + i})
        .eq('id', id)
        .eq('profile_id', profileId)
        .select('id');
      if (error) {
        console.error('[photos PUT] temp update failed', {id, error});
        return NextResponse.json({message: error.message}, {status: 500});
      }
    }

    // Step B: apply the desired sort_order values.
    for (const {id, order} of retainedPhotos) {
      const {data, error} = await admin
        .from('profile_photos')
        .update({sort_order: order})
        .eq('id', id)
        .eq('profile_id', profileId)
        .select('id, sort_order');

      if (error) {
        console.error('[photos PUT] final update failed', {id, order, error});
        return NextResponse.json({message: error.message}, {status: 500});
      }
      if (!data || data.length === 0) {
        // RLS or missing row silently drops the update
        console.error('[photos PUT] update matched 0 rows', {id, order, profileId});
        return NextResponse.json(
          {message: `사진 순서 저장 실패 (id: ${id})`},
          {status: 500},
        );
      }
    }
  }

  if (newPhotos.length > 0) {
    const rows = newPhotos.map(photo => ({
      id: photo.id,
      profile_id: profileId,
      storage_path: photo.storagePath,
      alt: photo.alt,
      sort_order: photo.order,
    }));

    const {error: insertError} = await supabase.from('profile_photos').insert(rows);

    if (insertError) {
      await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove(rows.map(r => r.storage_path));
      return NextResponse.json({message: insertError.message}, {status: 500});
    }
  }

  return NextResponse.json({ok: true});
}

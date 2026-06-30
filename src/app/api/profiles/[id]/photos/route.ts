import {NextResponse} from 'next/server';

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
// Body: {newPhotos: [{tempId, storagePath, alt, order}], retainedPhotoIds: string[]}
export async function PUT(request: Request, {params}: RouteParams) {
  const {id: profileId} = await params;
  const supabase = await createSupabaseServerClient();

  const {
    newPhotos,
    retainedPhotoIds,
  }: {
    newPhotos: {tempId: string; id: string; storagePath: string; alt: string; order: number}[];
    retainedPhotoIds: string[];
  } = await request.json();

  const {data: existingPhotos, error: fetchError} = await supabase
    .from('profile_photos')
    .select('id, storage_path')
    .eq('profile_id', profileId);

  if (fetchError) {
    return NextResponse.json({message: fetchError.message}, {status: 500});
  }

  const photosToDelete = (existingPhotos ?? []).filter(photo => !retainedPhotoIds.includes(photo.id));

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

  if (newPhotos.length > 0) {
    const rows = newPhotos.map(photo => ({
      id: photo.id,
      profile_id: profileId,
      storage_path: photo.storagePath,
      alt: photo.alt,
      order: photo.order,
    }));

    const {error: insertError} = await supabase.from('profile_photos').insert(rows);

    if (insertError) {
      await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove(rows.map(r => r.storage_path));
      return NextResponse.json({message: insertError.message}, {status: 500});
    }
  }

  return NextResponse.json({ok: true});
}

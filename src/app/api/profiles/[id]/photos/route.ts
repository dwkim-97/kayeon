import {NextResponse} from 'next/server';

import {createSupabaseServerClient, getStoragePublicBase, PROFILE_PHOTOS_BUCKET} from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteParams = {params: Promise<{id: string}>};

type UploadPhotoInput = {
  tempId: string;
  dataUrl: string;
  alt: string;
  order: number;
};

type PhotoDbRow = {id: string; profile_id: string; storage_path: string; alt: string; order: number};

export async function PUT(request: Request, {params}: RouteParams) {
  const {id: profileId} = await params;
  const supabase = await createSupabaseServerClient();

  const {newPhotos, retainedPhotoIds}: {newPhotos: UploadPhotoInput[]; retainedPhotoIds: string[]} =
    await request.json();

  const {data: existingPhotos, error: fetchError} = await supabase
    .from('profile_photos')
    .select('id, storage_path')
    .eq('profile_id', profileId);

  if (fetchError) {
    return NextResponse.json({message: fetchError.message}, {status: 500});
  }

  const photosToDelete = (existingPhotos ?? []).filter(photo => !retainedPhotoIds.includes(photo.id));

  if (photosToDelete.length > 0) {
    // Storage must be deleted before the DB row to avoid orphaned files: if
    // storage fails we abort before touching the DB; if DB fails the storage
    // objects are already gone (benign — they were unreachable anyway).
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

  const uploadResults = await Promise.all(
    newPhotos.map(async photo => {
      const dataUrlMatch = photo.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!dataUrlMatch) {
        throw new Error(`Invalid data URL for photo (tempId: ${photo.tempId})`);
      }
      const mimeType = dataUrlMatch[1];
      const base64Data = dataUrlMatch[2];
      const ext = mimeType.split('/')[1] ?? 'jpg';
      const id = crypto.randomUUID();
      const storagePath = `${profileId}/${id}.${ext}`;
      const buffer = Buffer.from(base64Data, 'base64');

      const {error: uploadError} = await supabase.storage.from(PROFILE_PHOTOS_BUCKET).upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const row: PhotoDbRow = {id, profile_id: profileId, storage_path: storagePath, alt: photo.alt, order: photo.order};
      return {tempId: photo.tempId, row};
    }),
  );

  if (uploadResults.length > 0) {
    const rows = uploadResults.map(r => r.row);
    const {error: insertError} = await supabase.from('profile_photos').insert(rows);

    if (insertError) {
      await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove(rows.map(r => r.storage_path));
      return NextResponse.json({message: insertError.message}, {status: 500});
    }

    const publicBase = getStoragePublicBase();
    const uploadedPhotoIds = uploadResults.map(({tempId, row}) => ({
      tempId,
      id: row.id,
      url: `${publicBase}/${row.storage_path}`,
    }));

    return NextResponse.json({uploadedPhotoIds});
  }

  return NextResponse.json({uploadedPhotoIds: []});
}

import {NextResponse} from 'next/server';

import {createSupabaseServerClient, getStoragePublicBase} from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteParams = {params: Promise<{id: string}>};

type UploadPhotoInput = {
  tempId: string;
  dataUrl: string;
  alt: string;
  order: number;
};

export async function PUT(request: Request, {params}: RouteParams) {
  const {id: profileId} = await params;
  const supabase = await createSupabaseServerClient();

  const {newPhotos, retainedPhotoIds}: {newPhotos: UploadPhotoInput[]; retainedPhotoIds: string[]} =
    await request.json();

  const {data: existingPhotos, error: fetchError} = await supabase
    .from('profile_photos')
    .select('*')
    .eq('profile_id', profileId);

  if (fetchError) {
    return NextResponse.json({message: fetchError.message}, {status: 500});
  }

  const photosToDelete = (existingPhotos ?? []).filter(photo => !retainedPhotoIds.includes(photo.id));

  if (photosToDelete.length > 0) {
    await supabase.storage
      .from('profile-photos')
      .remove(photosToDelete.map(photo => photo.storage_path));

    const {error: deleteError} = await supabase
      .from('profile_photos')
      .delete()
      .in(
        'id',
        photosToDelete.map(p => p.id),
      );

    if (deleteError) {
      return NextResponse.json({message: deleteError.message}, {status: 500});
    }
  }

  const uploadResults = await Promise.all(
    newPhotos.map(async photo => {
      const base64Data = photo.dataUrl.split(',')[1];
      const mimeMatch = photo.dataUrl.match(/data:([^;]+);base64,/);
      const mimeType = mimeMatch?.[1] ?? 'image/jpeg';
      const ext = mimeType.split('/')[1] ?? 'jpg';
      const storagePath = `${profileId}/${crypto.randomUUID()}.${ext}`;
      const buffer = Buffer.from(base64Data, 'base64');

      const {error: uploadError} = await supabase.storage.from('profile-photos').upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      return {tempId: photo.tempId, storagePath, alt: photo.alt, order: photo.order};
    }),
  );

  if (uploadResults.length > 0) {
    const insertRows = uploadResults.map(result => ({
      id: crypto.randomUUID(),
      profile_id: profileId,
      storage_path: result.storagePath,
      alt: result.alt,
      order: result.order,
    }));

    const {error: insertError} = await supabase.from('profile_photos').insert(insertRows);

    if (insertError) {
      await supabase.storage
        .from('profile-photos')
        .remove(uploadResults.map(r => r.storagePath));

      return NextResponse.json({message: insertError.message}, {status: 500});
    }

    const publicBase = getStoragePublicBase();
    const uploadedPhotoIds = insertRows.map((row, i) => ({
      tempId: uploadResults[i].tempId,
      id: row.id,
      url: `${publicBase}/${row.storage_path}`,
    }));

    return NextResponse.json({uploadedPhotoIds});
  }

  return NextResponse.json({uploadedPhotoIds: []});
}

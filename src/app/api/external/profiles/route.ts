import {NextResponse} from 'next/server';

import {isValidApiKey} from '@/lib/auth/api-key';
import {parseExternalProfile} from '@/lib/profiles/external-input';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {PROFILE_PHOTOS_BUCKET} from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isValidApiKey(request.headers.get('x-api-key'))) {
    return NextResponse.json({message: '유효하지 않은 API 키입니다.'}, {status: 401});
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({message: 'multipart/form-data 형식이어야 합니다.'}, {status: 400});
  }

  const dataRaw = form.get('data');
  if (typeof dataRaw !== 'string') {
    return NextResponse.json({message: 'data 필드(JSON 문자열)가 필요합니다.'}, {status: 400});
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(dataRaw);
  } catch {
    return NextResponse.json({message: 'data가 유효한 JSON이 아닙니다.'}, {status: 400});
  }

  const parsed = parseExternalProfile(parsedJson);
  if (!parsed.success) {
    return NextResponse.json({message: `검증 실패: ${parsed.error}`}, {status: 400});
  }

  const photos = form.getAll('photos').filter((f): f is File => f instanceof File);
  if (photos.length > 4) {
    return NextResponse.json({message: '사진은 최대 4장까지 가능합니다.'}, {status: 400});
  }

  const supabase = createSupabaseAdminClient();
  const pendingId = crypto.randomUUID();
  const uploadedPaths: string[] = [];

  for (const [i, photo] of photos.entries()) {
    const ext = (photo.type.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
    const path = `pending/${pendingId}/${i}.${ext}`;
    const buffer = new Uint8Array(await photo.arrayBuffer());
    const {error} = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .upload(path, buffer, {contentType: photo.type});
    if (error) {
      if (uploadedPaths.length > 0) await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove(uploadedPaths);
      return NextResponse.json({message: `사진 업로드 실패: ${error.message}`}, {status: 500});
    }
    uploadedPaths.push(path);
  }

  const v = parsed.value;
  const {data, error} = await supabase
    .from('pending_profiles')
    .insert({
      id: pendingId,
      gender: v.gender,
      birth_year: v.birthYear,
      height: v.height,
      residence: v.residence,
      job: v.job,
      religion: v.religion,
      mbti: v.mbti,
      hobbies: v.hobbies,
      smoking: v.smoking,
      drinking: v.drinking,
      ideal_type: v.idealType,
      matchmaker_comment: v.matchmakerComment,
      extra: v.extra,
      photo_paths: uploadedPaths,
    })
    .select('id')
    .single();

  if (error) {
    if (uploadedPaths.length > 0) await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove(uploadedPaths);
    return NextResponse.json({message: error.message}, {status: 500});
  }

  return NextResponse.json({pendingId: data.id}, {status: 201});
}

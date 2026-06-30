import {NextResponse} from 'next/server';

import {findAuthEmailForLoginId} from '@/lib/server/admin-users';
import {createSupabaseRouteClient} from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const loginId = String(formData.get('loginId') ?? '');
  const password = String(formData.get('password') ?? '');
  const authEmail = await findAuthEmailForLoginId(loginId);

  if (!authEmail) {
    return NextResponse.json({message: '아이디 또는 비밀번호를 확인해 주세요.'}, {status: 401});
  }

  const supabase = await createSupabaseRouteClient();
  const {error} = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (error) {
    return NextResponse.json({message: '아이디 또는 비밀번호를 확인해 주세요.'}, {status: 401});
  }

  return NextResponse.json({ok: true});
}

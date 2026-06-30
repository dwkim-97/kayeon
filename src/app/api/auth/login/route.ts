import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';

import {AUTH_COOKIE, isValidAccessPassword} from '@/lib/auth/session';
import {isValidManagedUserCredential} from '@/lib/server/admin-users';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const loginId = String(formData.get('loginId') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!isValidManagedUserCredential(loginId, password) && !isValidAccessPassword(password)) {
    return NextResponse.json({message: '아이디 또는 비밀번호를 확인해 주세요.'}, {status: 401});
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ok: true});
}

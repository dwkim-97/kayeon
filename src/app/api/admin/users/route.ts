import {NextResponse} from 'next/server';

import {createManagedUser, listManagedUsers} from '@/lib/server/admin-users';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({users: await listManagedUsers()});
  } catch {
    return NextResponse.json({message: '관리자 목록을 불러오지 못했습니다.'}, {status: 500});
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    loginId: string;
    password: string;
    recommenderName: string;
    phoneNumber: string;
  };
  const result = await createManagedUser(body);

  if (!result.success) {
    return NextResponse.json({message: result.message}, {status: 400});
  }

  return NextResponse.json({user: result.user});
}

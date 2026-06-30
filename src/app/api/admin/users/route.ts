import {NextResponse} from 'next/server';

import {createManagedUser, listManagedUsers} from '@/lib/server/admin-users';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({users: listManagedUsers()});
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    loginId: string;
    password: string;
    recommenderName: string;
    phoneNumber: string;
  };
  const result = createManagedUser(body);

  if (!result.success) {
    return NextResponse.json({message: result.message}, {status: 400});
  }

  return NextResponse.json({user: result.user});
}

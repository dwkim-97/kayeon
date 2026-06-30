import {NextResponse} from 'next/server';

import {removeManagedUser} from '@/lib/server/admin-users';

export const runtime = 'nodejs';

export async function DELETE(_request: Request, context: {params: Promise<{userId: string}>}) {
  const {userId} = await context.params;
  const result = removeManagedUser(userId);

  if (!result.success) {
    return NextResponse.json({message: result.message}, {status: 400});
  }

  return NextResponse.json({user: result.user});
}

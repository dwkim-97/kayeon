import {NextResponse} from 'next/server';

import {rowToMatch} from '@/lib/supabase/mappers';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import type {MatchStatus} from '@/types/match';

export const runtime = 'nodejs';

type RouteParams = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: RouteParams) {
  const {id} = await params;
  const supabase = await createSupabaseServerClient();
  const body = (await request.json()) as {status?: MatchStatus; memo?: string};

  const update: {status?: MatchStatus; memo?: string; ended_at?: string | null} = {};
  if (body.status !== undefined) {
    update.status = body.status;
    update.ended_at = body.status === 'ended' ? new Date().toISOString() : null;
  }
  if (body.memo !== undefined) update.memo = body.memo;

  const {data, error} = await supabase.from('matches').update(update).eq('id', id).select('*').single();
  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }
  return NextResponse.json({match: rowToMatch(data)});
}

export async function DELETE(_request: Request, {params}: RouteParams) {
  const {id} = await params;
  const supabase = await createSupabaseServerClient();
  const {error} = await supabase.from('matches').delete().eq('id', id);
  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }
  return NextResponse.json({ok: true});
}

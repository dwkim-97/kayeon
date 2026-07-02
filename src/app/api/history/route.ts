import {NextResponse} from 'next/server';

import {rowToHistoryEvent} from '@/lib/supabase/mappers';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import type {HistoryEventType} from '@/types/history';

export const runtime = 'nodejs';

const PAGE_SIZE = 30;

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const offset = Math.max(0, Number(new URL(request.url).searchParams.get('offset') ?? 0) || 0);

  // PAGE_SIZE + 1개를 요청해 "더 있는지(hasMore)"를 판단한 뒤, 초과분은 잘라낸다.
  const {data, error} = await supabase
    .from('history_events')
    .select('*')
    .order('created_at', {ascending: false})
    .range(offset, offset + PAGE_SIZE);

  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }

  const hasMore = data.length > PAGE_SIZE;
  const events = data.slice(0, PAGE_SIZE).map(rowToHistoryEvent);

  return NextResponse.json({events, hasMore});
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const body = (await request.json()) as {
    type: HistoryEventType;
    actorName: string;
    targetLabel: string;
    description: string;
  };

  const {error} = await supabase.from('history_events').insert({
    type: body.type,
    actor_name: body.actorName,
    target_label: body.targetLabel,
    description: body.description,
  });

  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }

  return NextResponse.json({ok: true}, {status: 201});
}

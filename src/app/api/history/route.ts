import {NextResponse} from 'next/server';

import {rowToHistoryEvent} from '@/lib/supabase/mappers';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import type {HistoryEventType} from '@/types/history';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {data, error} = await supabase
    .from('history_events')
    .select('*')
    .order('created_at', {ascending: false})
    .limit(200);

  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }

  return NextResponse.json({events: data.map(rowToHistoryEvent)});
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

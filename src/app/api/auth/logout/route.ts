import {NextResponse} from 'next/server';

import {createSupabaseRouteClient} from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createSupabaseRouteClient();
  await supabase.auth.signOut();

  return NextResponse.json({ok: true});
}

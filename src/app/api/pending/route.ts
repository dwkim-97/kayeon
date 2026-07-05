import {NextResponse} from 'next/server';

import {rowToPendingProfile} from '@/lib/supabase/pending-mappers';
import {createSupabaseServerClient, getStoragePublicBase} from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase
    .from('pending_profiles')
    .select('*')
    .order('created_at', {ascending: false});

  if (error) {
    return NextResponse.json({message: error.message}, {status: 500});
  }
  const base = getStoragePublicBase();
  return NextResponse.json({pending: data.map(row => rowToPendingProfile(row, base))});
}

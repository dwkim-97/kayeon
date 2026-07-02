import type {SupabaseClient} from '@supabase/supabase-js';

import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {createSupabaseServerClient} from '@/lib/supabase/server';

async function resolveUserName(supabase: SupabaseClient): Promise<string> {
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return '';

  const metaName = user.user_metadata?.name as string | undefined;
  if (metaName) return metaName;

  // legacy accounts: fall back to app_users table
  const admin = createSupabaseAdminClient();
  const {data} = await admin.from('app_users').select('name').eq('id', user.id).maybeSingle();
  return (data?.name as string | undefined) ?? '';
}

export async function getSessionUserName(supabase?: SupabaseClient): Promise<string> {
  const client = supabase ?? (await createSupabaseServerClient());
  return resolveUserName(client);
}

import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {createSupabaseServerClient} from '@/lib/supabase/server';

export async function getSessionUserName(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) return '';

  // user_metadata.name is set on new accounts; fall back to app_users for legacy accounts
  const metaName = user.user_metadata?.name as string | undefined;
  if (metaName) return metaName;

  const admin = createSupabaseAdminClient();
  const {data} = await admin.from('app_users').select('name').eq('id', user.id).maybeSingle();
  return (data?.name as string | undefined) ?? '';
}

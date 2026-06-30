import {createSupabaseServerClient} from '@/lib/supabase/server';

export async function getSessionUserName(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  return (user?.user_metadata?.name as string | undefined) ?? '';
}

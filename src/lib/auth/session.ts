import {createSupabaseServerClient} from '@/lib/supabase/server';

/** Returns the display name of the currently authenticated user from their JWT metadata. */
export async function getSessionUserName(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  return (user?.user_metadata?.name as string | undefined) ?? '';
}

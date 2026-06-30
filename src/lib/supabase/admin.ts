import {createClient} from '@supabase/supabase-js';

import {getSupabaseSecretKey, getSupabaseUrl} from './env';

export function createSupabaseAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

import {createClient} from '@supabase/supabase-js';

import {getSupabaseSecretKey, getSupabaseUrl} from './env';

export function createSupabaseAdminClient(signal?: AbortSignal) {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    global: signal ? {fetch: (input, init) => fetch(input, {...init, signal})} : undefined,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

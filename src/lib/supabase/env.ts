type SupabaseEnvName =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  | 'SUPABASE_SECRET_KEY';

function requireEnv(name: SupabaseEnvName) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} 환경변수를 설정해 주세요.`);
  }

  return value;
}

export function getSupabaseUrl() {
  return requireEnv('NEXT_PUBLIC_SUPABASE_URL');
}

export function getSupabasePublishableKey() {
  return requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
}

export function getSupabaseSecretKey() {
  return requireEnv('SUPABASE_SECRET_KEY');
}

import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

import type {Database} from './types';
import {getSupabasePublishableKey, getSupabaseUrl} from './env';

export const PROFILE_PHOTOS_BUCKET = 'profile-photos';

export function getStoragePublicBase() {
  return `${getSupabaseUrl()}/storage/v1/object/public/${PROFILE_PHOTOS_BUCKET}`;
}

// 쿠키 불필요한 공개 읽기 전용 클라이언트 (인증 없는 공개 페이지용)
export function createSupabasePublicClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabasePublishableKey());
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const {name, value, options} of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component에서 호출 시 쿠키 설정 불가 — 무시
        }
      },
    },
  });
}

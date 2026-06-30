import {createServerClient} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';

import {isPublicPath} from '@/lib/auth/routes';
import {getSupabasePublishableKey, getSupabaseUrl} from '@/lib/supabase/env';

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next({request});
  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const {name, value, options} of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToLogin(request);
  }

  // Revoked users are banned via `ban_duration` in removeManagedUser, so
  // getUser() already returns null for them. A separate app_users DB round-trip
  // on every request is unnecessary.

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/((?!_next/image).*)'],
};

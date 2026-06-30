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
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({name, value, options}) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToLogin(request);
  }

  const {data: appUser} = await supabase.from('app_users').select('id').eq('id', user.id).maybeSingle();

  if (!appUser) {
    await supabase.auth.signOut();
    return redirectToLogin(request);
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/((?!_next/image).*)'],
};

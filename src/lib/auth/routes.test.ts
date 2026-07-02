import {describe, expect, it} from 'vitest';

import {isPublicPath} from './routes';

describe('isPublicPath', () => {
  it('allows only the login page and static framework assets without authentication', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/login?next=%2F')).toBe(true);
    expect(isPublicPath('/api/auth/login')).toBe(true);
    expect(isPublicPath('/_next/static/chunks/app.js')).toBe(true);
    expect(isPublicPath('/favicon.ico')).toBe(true);

    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath('/admin')).toBe(false);
    expect(isPublicPath('/api/profiles')).toBe(false);
    expect(isPublicPath('/share/abc')).toBe(false);
    // /profiles/ is public (detail pages accessible without auth)
    expect(isPublicPath('/profiles/abc-123')).toBe(true);
  });
});

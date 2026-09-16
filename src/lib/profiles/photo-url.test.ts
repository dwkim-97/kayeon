import {describe, expect, it, vi, afterEach} from 'vitest';
import {photoThumbnailUrl} from './photo-url';
const base = 'https://proj.supabase.co';
const original = `${base}/storage/v1/object/public/profile-photos/abc/def.png`;
afterEach(() => vi.unstubAllEnvs());
describe('photoThumbnailUrl', () => {
  it('routes stored photos to our optimizer without the paid Supabase API', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', base);
    expect(photoThumbnailUrl(original, 520)).toBe('/api/photos/thumbnail?path=abc%2Fdef.png&width=650');
    expect(photoThumbnailUrl(original, 96)).toContain('width=240');
    expect(photoThumbnailUrl(original, 1200)).toContain('width=1200');
  });
  it('leaves previews and unrelated origins alone', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', base);
    for (const url of ['data:image/png;base64,AA', '', original.replace(base, 'https://other.test')]) {
      expect(photoThumbnailUrl(url, 400)).toBe(url);
    }
  });
  it('does not rewrite signed URLs or invalid storage paths', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', base);
    for (const url of [original + '?token=abc', original.replace('abc/def.png', '%2e%2e/secret.png')]) {
      expect(photoThumbnailUrl(url, 400)).toBe(url);
    }
  });
});

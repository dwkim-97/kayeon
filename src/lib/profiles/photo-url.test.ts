import {describe, expect, it} from 'vitest';

import {
  CARD_THUMB_WIDTH_COMPACT,
  CARD_THUMB_WIDTH_DETAILED,
  photoThumbnailUrl,
} from './photo-url';

const OBJECT_URL =
  'https://proj.supabase.co/storage/v1/object/public/profile-photos/abc/def.png';

describe('photoThumbnailUrl', () => {
  it('rewrites a public object URL to a render/image URL with width and quality', () => {
    const out = photoThumbnailUrl(OBJECT_URL, 520);
    expect(out).toBe(
      'https://proj.supabase.co/storage/v1/render/image/public/profile-photos/abc/def.png?width=520&quality=60',
    );
  });

  it('accepts a custom quality', () => {
    const out = photoThumbnailUrl(OBJECT_URL, 320, 50);
    expect(out).toContain('/render/image/public/');
    expect(out).toContain('width=320');
    expect(out).toContain('quality=50');
  });

  it('leaves data URLs untouched (upload previews must not break)', () => {
    const dataUrl = 'data:image/jpeg;base64,AAAA';
    expect(photoThumbnailUrl(dataUrl, 520)).toBe(dataUrl);
  });

  it('leaves non-matching URLs untouched', () => {
    const other = 'https://example.com/some/photo.jpg';
    expect(photoThumbnailUrl(other, 520)).toBe(other);
  });

  it('exposes distinct card widths', () => {
    expect(CARD_THUMB_WIDTH_DETAILED).toBeGreaterThan(CARD_THUMB_WIDTH_COMPACT);
  });
});

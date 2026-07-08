import {afterEach, describe, expect, it, vi} from 'vitest';

import {canNativeShareFiles, urlToFile, urlsToFiles} from './native-share';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('canNativeShareFiles', () => {
  it('returns true when navigator.canShare accepts files', () => {
    vi.stubGlobal('navigator', {canShare: () => true});
    expect(canNativeShareFiles()).toBe(true);
  });

  it('returns false when canShare rejects files', () => {
    vi.stubGlobal('navigator', {canShare: () => false});
    expect(canNativeShareFiles()).toBe(false);
  });

  it('returns false when canShare is absent', () => {
    vi.stubGlobal('navigator', {});
    expect(canNativeShareFiles()).toBe(false);
  });
});

describe('urlToFile', () => {
  it('fetches a URL and wraps it as a File', async () => {
    const blob = new Blob(['x'], {type: 'image/jpeg'});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    }));
    const file = await urlToFile('https://x/y.jpg', 'photo-0.jpg');
    expect(file).toBeInstanceOf(File);
    expect(file?.name).toBe('photo-0.jpg');
    expect(file?.type).toBe('image/jpeg');
  });

  it('returns null when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await urlToFile('https://x/y.jpg', 'photo-0.jpg')).toBeNull();
  });
});

describe('urlsToFiles', () => {
  it('converts multiple URLs, skipping failures', async () => {
    const blob = new Blob(['x'], {type: 'image/png'});
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ok: true, blob: () => Promise.resolve(blob)})
      .mockRejectedValueOnce(new Error('fail')));
    const files = await urlsToFiles(['https://x/a.png', 'https://x/b.png']);
    expect(files).toHaveLength(1);
  });
});

// @vitest-environment node
import {beforeEach, afterEach, describe, expect, it, vi} from 'vitest';
import sharp from 'sharp';
import {GET} from './route';
vi.mock('@/lib/supabase/server', () => ({getStoragePublicBase: () => 'https://project.supabase.co/storage/v1/object/public/profile-photos', PROFILE_PHOTOS_BUCKET: 'profile-photos'}));
const {info, upload, remove} = vi.hoisted(() => ({info: vi.fn(), upload: vi.fn(), remove: vi.fn()}));
vi.mock('@/lib/supabase/admin', () => ({createSupabaseAdminClient: () => ({storage: {from: () => ({upload, info, remove})}})}));
const base = 'https://project.supabase.co/storage/v1/object/public/profile-photos';
const request = (query: string) => new Request(`https://app.test/api/photos/thumbnail?${query}`);
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
beforeEach(() => {
  info.mockReset().mockResolvedValue({error: null});
  upload.mockReset().mockResolvedValue({error: null});
  remove.mockReset().mockResolvedValue({error: null});
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, {status: 404})));
});
describe('thumbnail route', () => {
  it('rejects traversal and arbitrary dimensions before fetching', async () => {
    expect((await GET(request('path=..%2Fx.png&width=240'))).status).toBe(400);
    expect((await GET(request('path=a%2Fb.png&width=241'))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('falls back to the public original without caching a transformation failure', async () => {
    const response = await GET(request('path=a%2Fb.png&width=240'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`${base}/a/b.png`);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('serves a cached variant without downloading the original', async () => {
    const bytes = await sharp({create: {width: 10, height: 10, channels: 3, background: 'red'}}).webp().toBuffer();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url === `${base}/_thumbnails/v1/240/a/b.png.webp`
      ? new Response(new Uint8Array(bytes), {headers: {'content-type': 'image/webp'}})
      : new Response(null, {status: 403})));
    const response = await GET(request('path=a%2Fb.png&width=240'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('cache-control')).toContain('s-maxage=86400');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(bytes));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not use privileged reads when the original is private', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, {status: 403})));
    expect((await GET(request('path=a%2Fprivate.png&width=240'))).status).toBe(307);
  });
  it('queues a burst and coalesces duplicate requests instead of downloading originals', async () => {
    const bytes = new Uint8Array([82, 73, 70, 70]);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    vi.stubGlobal('fetch', vi.fn(async () => {
      await gate;
      return new Response(bytes, {headers: {'content-type': 'image/webp'}});
    }));
    const requests = Array.from({length: 6}, (_, i) => request(`path=a%2Fburst-${i}.png&width=240`));
    const responses = requests.map(r => GET(r));
    responses.push(GET(request('path=a%2Fburst-0.png&width=240')));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(4));
    release();
    expect((await Promise.all(responses)).every(r => r.status === 200)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(6);
  });

  it('does not serve orphan thumbnails after the original was deleted', async () => {
    info.mockResolvedValue({error: {statusCode: '404'}});
    const response = await GET(request('path=a%2Fdeleted.png&width=240'));
    expect(response.status).toBe(307);
    expect(fetch).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith([
      '_thumbnails/v1/240/a/deleted.png.webp', '_thumbnails/v1/650/a/deleted.png.webp',
      '_thumbnails/v1/1200/a/deleted.png.webp',
    ]);
  });
  it('returns an original redirect before the host deadline even if storage stalls', async () => {
    vi.useFakeTimers();
    let release!: (value: {error: null}) => void;
    info.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const response = GET(request('path=a%2Fstalled.png&width=240'));
    await vi.advanceTimersByTimeAsync(22001);
    expect((await response).status).toBe(307);
    release({error: null});
    await vi.advanceTimersByTimeAsync(0);
  });

});

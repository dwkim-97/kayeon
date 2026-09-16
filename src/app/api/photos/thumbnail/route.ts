import {getThumbnail} from '@/lib/profiles/thumbnail';
import {THUMBNAIL_WIDTHS, thumbnailPaths, validPhotoPath} from '@/lib/profiles/thumbnail-path';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {getStoragePublicBase, PROFILE_PHOTOS_BUCKET} from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Collapse duplicate requests and bound concurrent image decoding per instance.
const pending = new Map<string, Promise<Uint8Array | null>>();
const MAX_CONCURRENT = 4;
const MAX_PENDING = 64;
let active = 0;
const waiters: Array<() => void> = [];

async function withImageSlot(run: () => Promise<Uint8Array | null>): Promise<Uint8Array | null> {
  if (active >= MAX_CONCURRENT) {
    const acquired = await new Promise<boolean>(resolve => {
      const enter = () => { clearTimeout(timer); resolve(true); };
      const timer = setTimeout(() => {
        const index = waiters.indexOf(enter);
        if (index >= 0) waiters.splice(index, 1);
        resolve(false);
      }, 8000);
      waiters.push(enter);
    });
    if (!acquired) return null;
  } else {
    active++;
  }
  try { return await run(); } finally {
    const next = waiters.shift();
    if (next) next();
    else active--;
  }
}

async function readPublicPhoto(path: string): Promise<Uint8Array | null> {
  const response = await fetch(`${getStoragePublicBase()}/${path}`, {
    signal: AbortSignal.timeout(5000), cache: 'no-store', redirect: 'error',
  });
  if (!response.ok) return null;
  if (!response.headers.get('content-type')?.startsWith('image/')) return null;
  const limit = 10 * 1024 * 1024;
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    return null;
  }
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  return new Uint8Array(Buffer.concat(chunks));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const path = params.get('path') ?? '';
  const width = Number(params.get('width'));
  if (!validPhotoPath(path) || !THUMBNAIL_WIDTHS.some(size => size === width)) {
    return new Response('Invalid photo request', {status: 400});
  }
  // Read only public objects without service credentials; never expose private originals.
  const original = `${getStoragePublicBase()}/${path}`;
  const fallback = () => new Response(null, {
    status: 307, headers: {Location: original, 'Cache-Control': 'no-store'},
  });
  const key = `${width}/${path}`;
  let job = pending.get(key);
  if (!job) {
    if (pending.size >= MAX_PENDING) return fallback();
    job = withImageSlot(async () => {
      // Metadata is not CDN cached: never serve orphan variants after deleting an original.
      const storage = createSupabaseAdminClient(AbortSignal.timeout(5000)).storage.from(PROFILE_PHOTOS_BUCKET);
      const {error: sourceError} = await storage.info(path);
      if (sourceError) {
        if (sourceError.statusCode === '404') await storage.remove(thumbnailPaths(path));
        return null;
      }
      return getThumbnail(path, width, {
      read: readPublicPhoto,
      write: async (cachePath, bytes) => {
        const writer = createSupabaseAdminClient(AbortSignal.timeout(5000)).storage.from(PROFILE_PHOTOS_BUCKET);
        const {error} = await writer.upload(cachePath, bytes, {contentType: 'image/webp', cacheControl: '86400', upsert: false});
        if (error) throw error;
        // Deletion may race generation. Clean up the just-written variant if the source disappeared.
        const {error: deleted} = await writer.info(path);
        if (deleted) await writer.remove([cachePath]);
      },
      });
    }).catch(() => null);
    pending.set(key, job);
    void job.finally(() => { pending.delete(key); });
  }
  // Finish below the platform deadline, including queueing and Storage latency.
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const image = await Promise.race([
    job,
    new Promise<null>(resolve => { deadline = setTimeout(() => resolve(null), 22000); }),
  ]).finally(() => clearTimeout(deadline));
  if (!image) return fallback();
  return new Response(new Uint8Array(image), {
    headers: {'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=3600, s-maxage=86400', 'X-Content-Type-Options': 'nosniff'},
  });
}

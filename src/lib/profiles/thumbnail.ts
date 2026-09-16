import sharp from 'sharp';
import {THUMBNAIL_WIDTHS, validPhotoPath} from './thumbnail-path';
export {thumbnailPaths, validPhotoPath} from './thumbnail-path';

type ThumbnailStorage = {
  read(path: string): Promise<Uint8Array | null>;
  write(path: string, bytes: Uint8Array): Promise<void>;
};

export async function getThumbnail(path: string, width: number, storage: ThumbnailStorage): Promise<Uint8Array | null> {
  if (!validPhotoPath(path) || !THUMBNAIL_WIDTHS.some(size => size === width)) return null;
  const cachePath = `_thumbnails/v1/${width}/${path}.webp`;
  try {
    const cached = await storage.read(cachePath);
    if (cached) return cached;
    const original = await storage.read(path);
    if (!original || original.byteLength > 10 * 1024 * 1024) return null;
    const resized = await sharp(original, {limitInputPixels: 25_000_000})
      .rotate()
      .resize(width, width, {fit: 'inside', withoutEnlargement: true})
      .webp({quality: 75})
      .timeout({seconds: 4})
      .toBuffer();
    // Cache persistence is best effort; a storage outage must not hide the photo.
    try { await storage.write(cachePath, resized); } catch { /* Return the generated image. */ }
    return resized;
  } catch {
    return null;
  }
}

// @vitest-environment node
import {describe, expect, it} from 'vitest';
import sharp from 'sharp';
import {getThumbnail, thumbnailPaths, validPhotoPath} from './thumbnail';
import {photoPathsWithThumbnails} from './thumbnail-path';

describe('stored thumbnails', () => {
  it('shrinks without distorting and reuses the saved WebP on subsequent requests', async () => {
    const original = await sharp({create: {width: 1000, height: 1500, channels: 3, background: '#dbaabb'}}).png().toBuffer();
    const files = new Map<string, Uint8Array>([['a/b.png', original]]);
    let originalReads = 0;
    const storage = {
      read: async (path: string) => { if (path === 'a/b.png') originalReads++; return files.get(path) ?? null; },
      write: async (path: string, bytes: Uint8Array) => { files.set(path, bytes); },
    };
    const first = await getThumbnail('a/b.png', 240, storage);
    expect(first).not.toBeNull();
    const info = await sharp(first!).metadata();
    expect(info).toMatchObject({width: 160, height: 240, format: 'webp'});
    expect(first!.byteLength).toBeLessThan(original.byteLength);
    expect(await getThumbnail('a/b.png', 240, storage)).toEqual(first);
    expect(originalReads).toBe(1);
    expect(thumbnailPaths('a/b.png').every(path => !path.includes('/render/'))).toBe(true);
  });
  it('returns null for missing/corrupt originals so the caller can fall back', async () => {
    const write = async () => {};
    expect(await getThumbnail('a/b.png', 240, {read: async () => null, write})).toBeNull();
    expect(await getThumbnail('a/b.png', 240, {read: async p => p === 'a/b.png' ? new Uint8Array([1, 2]) : null, write})).toBeNull();
  });
  it('still serves the resized image when storing the cache fails', async () => {
    const original = await sharp({create: {width: 20, height: 10, channels: 3, background: 'red'}}).png().toBuffer();
    const result = await getThumbnail('a/b.png', 240, {
      read: async p => p === 'a/b.png' ? original : null,
      write: async () => { throw new Error('storage unavailable'); },
    });
    expect(await sharp(result!).metadata()).toMatchObject({width: 20, height: 10});
  });
  it('rejects traversal, URLs, derived inputs and unbounded sizes', async () => {
    for (const path of ['../x.png', 'a/../x.png', 'https://evil/x.png', 'a/%2e%2e/x.png', 'a/x.svg', '_thumbnails/v1/240/a.png']) {
      expect(validPhotoPath(path)).toBe(false);
    }
    const storage = {read: async () => {throw new Error('must not read');}, write: async () => {}};
    expect(await getThumbnail('a/b.png', 999, storage)).toBeNull();
  });
  it('includes every cached variant when removing an original', () => {
    expect(photoPathsWithThumbnails(['a/b.png'])).toEqual([
      'a/b.png', '_thumbnails/v1/240/a/b.png.webp',
      '_thumbnails/v1/650/a/b.png.webp', '_thumbnails/v1/1200/a/b.png.webp',
    ]);
  });

  it.each([[1200, 600, 240, 120], [600, 1200, 120, 240]])(
    'keeps all edges of a %ix%i photo', async (width, height, expectedWidth, expectedHeight) => {
      const original = await sharp({create: {width, height, channels: 3, background: 'blue'}}).png().toBuffer();
      const result = await getThumbnail('a/edges.png', 240, {
        read: async p => p === 'a/edges.png' ? original : null,
        write: async () => {},
      });
      expect(await sharp(result!).metadata()).toMatchObject({width: expectedWidth, height: expectedHeight});
    },
  );

});

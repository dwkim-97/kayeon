// Fixed variants bound storage/CPU usage even when arbitrary sizes are requested.
export const THUMBNAIL_WIDTHS = [240, 650, 1200] as const;
export function validPhotoPath(path: string): boolean {
  return path.length <= 300 && /^[a-zA-Z0-9-]+(?:\/[a-zA-Z0-9-]+)*\.(?:png|jpe?g|webp)$/i.test(path);
}
export function thumbnailPaths(path: string): string[] {
  return THUMBNAIL_WIDTHS.map(width => `_thumbnails/v1/${width}/${path}.webp`);
}
export function photoPathsWithThumbnails(paths: string[]): string[] {
  return paths.flatMap(path => [path, ...thumbnailPaths(path)]);
}

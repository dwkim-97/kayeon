import {THUMBNAIL_WIDTHS, validPhotoPath} from './thumbnail-path';

export const CARD_THUMB_WIDTH_DETAILED = 650; // 상세보기 카드(~260px 표시)
export const CARD_THUMB_WIDTH_COMPACT = 400; // 작게보기 카드(~160px 표시)
export const DETAIL_IMAGE_WIDTH = 1200; // 상세 모달/공개 상세/라이트박스 메인
export const PARTNER_THUMB_WIDTH = 96; // 매칭 상대 40px 썸네일(2배+여유)
export const MATCH_BOARD_THUMB_WIDTH = 240; // 매칭 모드 보드 카드(정사각, PC ~120px 표시 2배)
export const LIGHTBOX_THUMB_WIDTH = 160; // 라이트박스 하단 56px 썸네일

// Original uploads remain unchanged. The app creates and stores WebP variants on demand.
export function photoThumbnailUrl(url: string, maxDimension: number): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!base) return url;
  const prefix = `${base}/storage/v1/object/public/profile-photos/`;
  if (!url.startsWith(prefix)) return url;
  const path = url.slice(prefix.length);
  if (!validPhotoPath(path)) return url;
  const width = THUMBNAIL_WIDTHS.find(size => size >= maxDimension) ?? 1200;
  return `/api/photos/thumbnail?path=${encodeURIComponent(path)}&width=${width}`;
}

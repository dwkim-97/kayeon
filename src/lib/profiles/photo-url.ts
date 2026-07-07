// 매물 사진 표시용 URL 헬퍼.
// Supabase Storage 공개 object URL을 render/image 변환 URL로 바꿔
// 표시 크기에 맞는 작은 이미지(브라우저 Accept에 따라 webp)를 받게 한다.
// 원본은 건드리지 않고 표시 시점에만 적용한다.

// 표시별 목표 폭(px). 레티나 2배를 고려해 CSS 표시폭의 약 2배로 둔다.
export const CARD_THUMB_WIDTH_DETAILED = 520; // 상세보기 카드(~260px 표시)
export const CARD_THUMB_WIDTH_COMPACT = 320; // 작게보기 카드(~160px 표시)
export const DETAIL_IMAGE_WIDTH = 1200; // 상세 모달/공개 상세/라이트박스 메인
export const PARTNER_THUMB_WIDTH = 96; // 매칭 상대 40px 썸네일(2배+여유)
export const LIGHTBOX_THUMB_WIDTH = 160; // 라이트박스 하단 56px 썸네일

const OBJECT_MARKER = '/storage/v1/object/public/';
const RENDER_MARKER = '/storage/v1/render/image/public/';
const DEFAULT_QUALITY = 60;

// 공개 object URL이면 render 변환 URL로 바꾸고 width/quality를 붙인다.
// 대상이 아니면(예: data URL, 외부 URL) 원본을 그대로 반환한다.
export function photoThumbnailUrl(url: string, width: number, quality = DEFAULT_QUALITY): string {
  if (!url || !url.includes(OBJECT_MARKER)) return url;
  const rendered = url.replace(OBJECT_MARKER, RENDER_MARKER);
  return `${rendered}?width=${width}&quality=${quality}`;
}

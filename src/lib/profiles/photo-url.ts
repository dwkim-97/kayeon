// 매물 사진 표시용 URL 헬퍼.
// Supabase Storage 공개 object URL을 render/image 변환 URL로 바꿔
// 표시 크기에 맞는 작은 이미지(브라우저 Accept에 따라 webp)를 받게 한다.
// 원본은 건드리지 않고 표시 시점에만 적용한다.
//
// ⚠️ width만 주면 Supabase가 비율을 유지하지 않고 세로를 원본대로 남긴다
//    (예: 1042x1390 원본에 width=520 → 520x1390 로 찌그러짐).
//    그래서 항상 width=height=<최대 변> + resize=contain 으로 요청해
//    "긴 변 기준으로 비율 유지하며 축소"(잘림/찌그러짐 없음)되게 한다.

// 표시별 최대 변 길이(px). 레티나 2배를 고려해 CSS 표시크기의 약 2배로 둔다.
// 이 값 이하로만 축소되며 원본 비율은 그대로 유지된다(잘리지 않음).
export const CARD_THUMB_WIDTH_DETAILED = 650; // 상세보기 카드(~260px 표시)
export const CARD_THUMB_WIDTH_COMPACT = 400; // 작게보기 카드(~160px 표시)
export const DETAIL_IMAGE_WIDTH = 1200; // 상세 모달/공개 상세/라이트박스 메인
export const PARTNER_THUMB_WIDTH = 96; // 매칭 상대 40px 썸네일(2배+여유)
export const MATCH_BOARD_THUMB_WIDTH = 240; // 매칭 모드 보드 카드(정사각, PC ~120px 표시 2배)
export const LIGHTBOX_THUMB_WIDTH = 160; // 라이트박스 하단 56px 썸네일

const OBJECT_MARKER = '/storage/v1/object/public/';
const RENDER_MARKER = '/storage/v1/render/image/public/';
const DEFAULT_QUALITY = 60;

// 공개 object URL이면 render 변환 URL로 바꾸고, 긴 변을 maxDimension 이하로
// 비율 유지하며 축소한다(resize=contain). 대상이 아니면 원본을 그대로 반환한다.
export function photoThumbnailUrl(url: string, maxDimension: number, quality = DEFAULT_QUALITY): string {
  if (!url || !url.includes(OBJECT_MARKER)) return url;
  const rendered = url.replace(OBJECT_MARKER, RENDER_MARKER);
  return `${rendered}?width=${maxDimension}&height=${maxDimension}&resize=contain&quality=${quality}`;
}

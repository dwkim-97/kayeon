// 매물 사진 업로드 전 클라이언트에서 리사이즈/재인코딩한다.
// 목적: (1) Storage 버킷의 10MB 제한·허용 형식(jpeg/png/webp)에 맞추고
//       (2) 큰 원본으로 업로드가 조용히 실패하던 문제를 예방한다.

// Storage 버킷 설정과 일치해야 한다 (initial_schema.sql: profile-photos).
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

// 리사이즈 목표: 긴 변을 이 값 이하로. 프로필 사진 용도로 충분한 해상도.
export const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export function isAllowedImageType(type: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

// 원본 크기를 긴 변 기준 maxDimension 이하로 줄인 목표 크기(정수)를 계산한다.
// 이미 작으면 원본 크기를 그대로 반환한다(확대하지 않음).
export function computeResizedDimensions(
  width: number,
  height: number,
  maxDimension = MAX_IMAGE_DIMENSION,
): {width: number; height: number} {
  const longest = Math.max(width, height);
  if (longest <= maxDimension || longest === 0) {
    return {width: Math.round(width), height: Math.round(height)};
  }
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// 미허용 형식을 사람이 읽는 사유 문자열로. 허용 형식이면 null.
export function describeUnsupportedType(fileName: string, type: string): string | null {
  if (isAllowedImageType(type)) return null;
  const heicHint = /\.(heic|heif)$/i.test(fileName) || type === 'image/heic' || type === 'image/heif';
  if (heicHint) {
    return `${fileName}: 아이폰 HEIC 형식은 지원하지 않습니다. 카메라 설정에서 '호환성 우선(JPEG)'으로 촬영하거나 JPG로 변환해 올려주세요.`;
  }
  return `${fileName}: 지원하지 않는 형식입니다(${type || '알 수 없음'}). JPG·PNG·WEBP만 등록할 수 있습니다.`;
}

export type ResizeSuccess = {ok: true; dataUrl: string; mimeType: string};
export type ResizeFailure = {ok: false; reason: string};
export type ResizeResult = ResizeSuccess | ResizeFailure;

// 파일을 canvas로 리사이즈해 data URL로 반환한다. 브라우저 전용(document/Image 사용).
// - 미허용 형식이면 사유와 함께 실패.
// - 리사이즈 후에도 10MB를 넘으면 실패(사유 표시).
export async function resizeImageFile(file: File): Promise<ResizeResult> {
  const unsupported = describeUnsupportedType(file.name, file.type);
  if (unsupported) return {ok: false, reason: unsupported};

  let bitmapUrl = '';
  try {
    bitmapUrl = URL.createObjectURL(file);
    const img = await loadImage(bitmapUrl);
    const {width, height} = computeResizedDimensions(img.naturalWidth, img.naturalHeight);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return {ok: false, reason: `${file.name}: 이미지 처리를 초기화하지 못했습니다.`};
    ctx.drawImage(img, 0, 0, width, height);

    // PNG는 투명도를 유지하려 PNG로, 그 외는 JPEG로 재인코딩(용량 절감).
    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(outType, JPEG_QUALITY);

    const bytes = estimateDataUrlBytes(dataUrl);
    if (bytes > MAX_UPLOAD_BYTES) {
      return {
        ok: false,
        reason: `${file.name}: 리사이즈 후에도 용량이 너무 큽니다(약 ${formatMB(bytes)}MB). 더 작은 사진을 사용해주세요.`,
      };
    }

    return {ok: true, dataUrl, mimeType: outType};
  } catch {
    return {ok: false, reason: `${file.name}: 이미지를 불러오지 못했습니다. 파일이 손상되었을 수 있습니다.`};
  } finally {
    if (bitmapUrl) URL.revokeObjectURL(bitmapUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

// base64 data URL의 대략적인 바이트 수. base64는 4문자당 3바이트.
export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',');
  const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

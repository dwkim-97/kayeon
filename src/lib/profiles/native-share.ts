// Web Share API로 사진 파일을 공유하기 위한 헬퍼.
// 실제 navigator.share 호출은 사용자 제스처/HTTPS가 필요하므로 버튼에서 수행하고,
// 여기서는 지원 판별과 URL→File 변환(테스트 가능한 순수 로직)만 담당한다.

// 이 브라우저가 '파일 공유'를 지원하는지. 서버/미지원 환경에서는 false.
export function canNativeShareFiles(probeFile?: File): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & {canShare?: (data?: {files?: File[]}) => boolean};
  if (typeof nav.canShare !== 'function') return false;
  try {
    const files = probeFile ? [probeFile] : [new File([''], 'probe.txt', {type: 'text/plain'})];
    return nav.canShare({files});
  } catch {
    return false;
  }
}

// URL 하나를 File로. 실패하면 null.
export async function urlToFile(url: string, fileName: string): Promise<File | null> {
  try {
    const res = await fetch(url);
    if (!('ok' in res) || !res.ok) return null;
    const blob = await res.blob();
    return new File([blob], fileName, {type: blob.type || 'image/jpeg'});
  } catch {
    return null;
  }
}

// 여러 URL을 File 배열로(실패는 제외). 파일명은 확장자 추정해 photo-{i}.{ext}.
export async function urlsToFiles(urls: string[]): Promise<File[]> {
  const results = await Promise.all(
    urls.map((url, i) => {
      const extMatch = url.split('?')[0].match(/\.(jpg|jpeg|png|webp)$/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
      return urlToFile(url, `photo-${i + 1}.${ext}`);
    }),
  );
  return results.filter((f): f is File => f !== null);
}

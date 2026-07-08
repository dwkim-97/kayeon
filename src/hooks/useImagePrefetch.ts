'use client';

import {useEffect} from 'react';

// 주어진 이미지 URL들을 백그라운드로 미리 로드한다(브라우저 캐시에 적재).
// 상세보기 진입 시 큰 사진이 캐시에서 즉시 떠 체감 성능이 올라간다.
//
// 안전장치:
//  - requestIdleCallback으로 idle 시점에 시작 → 초기 썸네일 로딩을 방해하지 않음
//  - 동시 요청 수 제한(concurrency) → 네트워크 포화 방지
//  - 언마운트 시 중단(cancelled 플래그)
const CONCURRENCY = 4;

type IdleHandle = {cancel: () => void};

function scheduleIdle(run: () => void): IdleHandle {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    const id = window.requestIdleCallback(run, {timeout: 2000});
    return {cancel: () => window.cancelIdleCallback(id)};
  }
  const id = setTimeout(run, 400);
  return {cancel: () => clearTimeout(id)};
}

function loadOne(url: string): Promise<void> {
  return new Promise(resolve => {
    const img = new Image();
    // 성공/실패 모두 다음 URL로 넘어가야 하므로 둘 다 resolve
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

export function useImagePrefetch(urls: string[], enabled: boolean): void {
  // urls 배열의 정체성이 매 렌더 바뀌지 않도록 호출부에서 useMemo로 감싼다.
  useEffect(() => {
    if (!enabled || urls.length === 0) return;

    let cancelled = false;
    let cursor = 0;

    const worker = async (): Promise<void> => {
      while (!cancelled && cursor < urls.length) {
        const index = cursor;
        cursor += 1;
        await loadOne(urls[index]);
      }
    };

    const idle = scheduleIdle(() => {
      // CONCURRENCY개의 워커가 공유 커서를 소비하며 병렬 로드
      const count = Math.min(CONCURRENCY, urls.length);
      for (let i = 0; i < count; i += 1) void worker();
    });

    return () => {
      cancelled = true;
      idle.cancel();
    };
  }, [urls, enabled]);
}

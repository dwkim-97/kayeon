'use client';

import {useEffect, useRef} from 'react';

const CONCURRENCY = 2;

function waitForThumbnail(img: HTMLImageElement, signal: AbortSignal): Promise<void> {
  if (img.complete || signal.aborted) return Promise.resolve();
  return new Promise(resolve => {
    const finish = () => {
      clearTimeout(timeout);
      img.removeEventListener('load', finish);
      img.removeEventListener('error', finish);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timeout = setTimeout(finish, 10000);
    img.addEventListener('load', finish);
    img.addEventListener('error', finish);
    signal.addEventListener('abort', finish, {once: true});
  });
}

function loadOne(url: string, signal: AbortSignal): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    let finished = false;
    const finish = (success: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      img.onload = img.onerror = null;
      signal.removeEventListener('abort', abort);
      if (!success && signal.aborted) img.removeAttribute('src');
      resolve(success);
    };
    const abort = () => finish(false);
    const timeout = setTimeout(() => { img.removeAttribute('src'); finish(false); }, 30000);
    img.fetchPriority = 'low';
    img.decoding = 'async';
    img.onload = () => { void img.decode().catch(() => {}).then(() => finish(!signal.aborted)); };
    img.onerror = () => finish(false);
    signal.addEventListener('abort', abort, {once: true});
    if (signal.aborted) abort();
    else img.src = url;
  });
}

export function useImagePrefetch(urls: string[], enabled: boolean): void {
  const completed = useRef(new Set<string>());
  useEffect(() => {
    if (!enabled || urls.length === 0) return;
    const controller = new AbortController();
    const {signal} = controller;
    let cursor = 0;
    let cancelIdle = () => {};
    const queue = [...new Set(urls)].filter(url => !completed.current.has(url));
    const worker = async () => {
      while (!signal.aborted && cursor < queue.length) {
        const url = queue[cursor++];
        if (await loadOne(url, signal)) completed.current.add(url);
      }
    };
    const start = () => {
      if (signal.aborted) return;
      for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) void worker();
    };
    // Wait only for thumbnails currently on screen; offscreen lazy images must not block us.
    const visible = Array.from(document.querySelectorAll<HTMLImageElement>('img[data-profile-thumbnail]'))
      .filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
          && rect.top < window.innerHeight && rect.left < window.innerWidth;
      });
    void Promise.all(visible.map(img => waitForThumbnail(img, signal))).then(() => {
      if (signal.aborted) return;
      if ('requestIdleCallback' in window) {
        const id = window.requestIdleCallback(start, {timeout: 2000});
        cancelIdle = () => window.cancelIdleCallback(id);
      } else {
        const id = setTimeout(start, 400);
        cancelIdle = () => clearTimeout(id);
      }
    });
    return () => { controller.abort(); cancelIdle(); };
  }, [urls, enabled]);
}

'use client';

/* eslint-disable @next/next/no-img-element */

import {ChevronLeft, ChevronRight, X} from 'lucide-react';
import {useEffect} from 'react';

import {useBodyScrollLock} from '@/hooks/useBodyScrollLock';
import type {ProfilePhoto} from '@/types/profile';

type PhotoLightboxProps = {
  photos: ProfilePhoto[];
  initialIndex: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

export function PhotoLightbox({photos, currentIndex, onIndexChange, onClose}: PhotoLightboxProps) {
  const hasMultiple = photos.length > 1;
  useBodyScrollLock(true);

  const moveTo = (direction: -1 | 1) => {
    onIndexChange((currentIndex + direction + photos.length) % photos.length);
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') moveTo(-1);
      if (event.key === 'ArrowRight') moveTo(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const photo = photos[currentIndex];
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* 닫기 버튼 */}
      <button
        className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
        type="button"
        onClick={onClose}
        aria-label="닫기"
      >
        <X size={20} aria-hidden />
      </button>

      {/* 카운터 */}
      {hasMultiple ? (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-bold text-white">
          {currentIndex + 1} / {photos.length}
        </div>
      ) : null}

      {/* 이미지 영역 */}
      <div
        className="relative flex h-full w-full items-center justify-center px-14 py-16 sm:px-20 sm:py-12"
        onClick={e => e.stopPropagation()}
      >
        <img
          key={photo.id}
          className="max-h-full max-w-full select-none rounded-[8px] object-contain shadow-2xl"
          src={photo.url}
          alt={photo.alt}
          draggable={false}
        />
      </div>

      {/* 이전/다음 버튼 */}
      {hasMultiple ? (
        <>
          <button
            className="absolute left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:left-4 sm:h-12 sm:w-12"
            type="button"
            onClick={e => { e.stopPropagation(); moveTo(-1); }}
            aria-label="이전 사진"
          >
            <ChevronLeft size={24} aria-hidden />
          </button>
          <button
            className="absolute right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:right-4 sm:h-12 sm:w-12"
            type="button"
            onClick={e => { e.stopPropagation(); moveTo(1); }}
            aria-label="다음 사진"
          >
            <ChevronRight size={24} aria-hidden />
          </button>
        </>
      ) : null}

      {/* 하단 썸네일 (모바일: 점 인디케이터, 데스크톱: 썸네일) */}
      {hasMultiple ? (
        <>
          {/* 모바일 dot indicator */}
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5 sm:hidden">
            {photos.map((p, i) => (
              <button
                key={p.id}
                className={`h-2 rounded-full transition-all ${i === currentIndex ? 'w-5 bg-white' : 'w-2 bg-white/40'}`}
                type="button"
                onClick={e => { e.stopPropagation(); onIndexChange(i); }}
                aria-label={`${i + 1}번째 사진`}
              />
            ))}
          </div>
          {/* 데스크톱 썸네일 */}
          <div className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 gap-2 sm:flex">
            {photos.map((p, i) => (
              <button
                key={p.id}
                className={`h-14 w-14 overflow-hidden rounded-[6px] border-2 transition ${
                  i === currentIndex ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
                type="button"
                onClick={e => { e.stopPropagation(); onIndexChange(i); }}
                aria-label={`${i + 1}번째 사진으로 이동`}
              >
                <img className="h-full w-full object-cover" src={p.url} alt={p.alt} />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

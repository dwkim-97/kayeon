'use client';

/* eslint-disable @next/next/no-img-element */

import {ChevronLeft, ChevronRight} from 'lucide-react';
import {useState} from 'react';

import type {ProfilePhoto} from '@/types/profile';

type PhotoSliderProps = {
  photos: ProfilePhoto[];
};

export function PhotoSlider({photos}: PhotoSliderProps) {
  const [index, setIndex] = useState(0);
  const hasMultiple = photos.length > 1;

  const move = (dir: -1 | 1) => {
    setIndex(i => (i + dir + photos.length) % photos.length);
  };

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-[12px] bg-[var(--violet-100)] text-sm text-slate-500">
        사진 없음
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[12px] bg-[var(--violet-100)]">
      <div className="relative aspect-[4/3]">
        {photos.map((photo, i) => (
          <img
            key={photo.id}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
            src={photo.url}
            alt={photo.alt}
            style={{opacity: i === index ? 1 : 0}}
            draggable={false}
          />
        ))}
      </div>

      {hasMultiple ? (
        <>
          <button
            className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
            type="button"
            onClick={() => move(-1)}
            aria-label="이전 사진"
          >
            <ChevronLeft size={22} aria-hidden />
          </button>
          <button
            className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
            type="button"
            onClick={() => move(1)}
            aria-label="다음 사진"
          >
            <ChevronRight size={22} aria-hidden />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-2 bg-white/50'}`}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}번째 사진`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

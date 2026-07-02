'use client';

/* eslint-disable @next/next/no-img-element */

import {ChevronLeft, ChevronRight} from 'lucide-react';
import {useState} from 'react';

import type {ProfileInformationRow} from '@/lib/profiles/information';
import type {ProfilePhoto} from '@/types/profile';

type PhotoSliderProps = {
  photos: ProfilePhoto[];
  infoRows: ProfileInformationRow[];
};

export function PhotoSlider({photos, infoRows}: PhotoSliderProps) {
  const [index, setIndex] = useState(0);
  const hasMultiple = photos.length > 1;

  const move = (dir: -1 | 1) => {
    setIndex(i => (i + dir + photos.length) % photos.length);
  };

  if (photos.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--violet-100)] text-sm text-slate-500">
        사진 없음
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* 사진 */}
      {photos.map((photo, i) => (
        <img
          key={photo.id}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          src={photo.url}
          alt={photo.alt}
          style={{opacity: i === index ? 1 : 0}}
          draggable={false}
        />
      ))}

      {/* 모바일: 하단 gradient + 정보 오버레이 (md 이상에서 숨김) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 md:hidden">
        <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-6 pt-20">
          <ul className="space-y-1">
            {infoRows.map(([label, value]) => (
              <li key={label} className="flex gap-2 text-sm">
                <span className="w-16 shrink-0 font-bold text-white/70">{label}</span>
                <span className="break-keep text-white">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 이전/다음 버튼 */}
      {hasMultiple ? (
        <>
          <button
            className="absolute left-3 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
            type="button"
            onClick={() => move(-1)}
            aria-label="이전 사진"
          >
            <ChevronLeft size={22} aria-hidden />
          </button>
          <button
            className="absolute right-3 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
            type="button"
            onClick={() => move(1)}
            aria-label="다음 사진"
          >
            <ChevronRight size={22} aria-hidden />
          </button>

          {/* dot indicator */}
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 md:bottom-4">
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

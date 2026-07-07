'use client';

import {Sparkles, X} from 'lucide-react';

// 새 매물 알림 배너. 반짝이는 별 + 지나가는 빛줄기 연출로 눈에 띄게.
// 접속 시 새로 등록된 매물이 있을 때만 대시보드에서 렌더한다.
export function NewArrivalToast({count, onClose}: {count: number; onClose: () => void}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
      <div
        className="new-arrival-pop pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-full border border-white/30 bg-gradient-to-r from-[var(--violet-600)] via-[var(--violet-500)] to-[var(--violet-400)] py-2.5 pl-4 pr-2.5 text-white shadow-[0_12px_40px_rgba(255,56,92,0.45)]"
        role="status"
        aria-live="polite"
      >
        {/* 지나가는 빛줄기 */}
        <span
          className="new-arrival-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/25 blur-md"
          aria-hidden
        />

        {/* 반짝이는 별 3개 */}
        <span className="relative grid h-7 w-7 shrink-0 place-items-center" aria-hidden>
          <Sparkles size={20} strokeWidth={2} className="drop-shadow" />
          <span className="new-arrival-twinkle new-arrival-twinkle-delay-1 absolute -right-0.5 -top-1 text-[10px]">
            ✨
          </span>
          <span className="new-arrival-twinkle new-arrival-twinkle-delay-2 absolute -bottom-1 left-0 text-[8px]">
            ✨
          </span>
          <span className="new-arrival-twinkle new-arrival-twinkle-delay-3 absolute -top-1.5 left-1 text-[7px]">
            ⭐️
          </span>
        </span>

        <span className="relative whitespace-nowrap text-sm font-bold drop-shadow-sm">
          새로운 매물 {count}명이 등록됐어요!
        </span>

        <button
          className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/80 transition hover:bg-white/20 hover:text-white"
          type="button"
          onClick={onClose}
          aria-label="알림 닫기"
        >
          <X size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}

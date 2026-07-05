'use client';

import {ArrowDownWideNarrow, ArrowUpNarrowWide, ArrowUpDown, ChevronDown, ChevronUp} from 'lucide-react';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import type {ProfileFilters, SortDirection, SortField} from '@/types/profile';

type SortMenuProps = {
  filters: ProfileFilters;
  onChange: (filters: ProfileFilters) => void;
};

const sortFieldOptions: Array<[SortField, string]> = [
  ['default', '기본순'],
  ['age', '나이순'],
  ['height', '키순'],
  ['createdAt', '등록일순'],
];

// 정렬 방향 라벨은 기준에 따라 뜻이 달라 헷갈리므로 필드별로 문구를 맞춘다.
const sortDirectionLabels: Record<SortField, {asc: string; desc: string}> = {
  default: {asc: '오름차순', desc: '내림차순'},
  age: {asc: '어린 순', desc: '나이 많은 순'},
  height: {asc: '작은 순', desc: '큰 순'},
  createdAt: {asc: '오래된 순', desc: '최신 순'},
};

function fieldLabel(field: SortField): string {
  return sortFieldOptions.find(([value]) => value === field)?.[1] ?? '기본순';
}

// 필터 버튼 옆에 두는 정렬 팝오버. 버튼을 누르면 기준(라디오)+방향 패널이 열린다.
// 패널은 <body>로 portal + 버튼 기준 fixed 좌표 → 툴바의 overflow-x-auto나
// 조상의 backdrop-filter에 클립되지 않는다(드로어와 동일한 이유).
export function SortMenu({filters, onChange}: SortMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{top: number; right: number} | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const isActive = filters.sortField !== 'default';

  useEffect(() => {
    // SSR-safe portal gate: 서버·클라 첫 렌더가 일치(포탈 없음), 마운트 후에만 포탈.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // 버튼 위치에 맞춰 패널 좌표를 잡는다(열릴 때 + 스크롤/리사이즈 시).
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setCoords({top: rect.bottom + 4, right: window.innerWidth - rect.right});
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  // 바깥 클릭 / ESC 로 닫기
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const buttonLabel = isActive
    ? `${fieldLabel(filters.sortField)} · ${sortDirectionLabels[filters.sortField][filters.sortDirection]}`
    : '정렬';

  return (
    <>
      <button
        ref={buttonRef}
        className={`inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-[8px] border px-2 text-[11px] font-semibold transition ${
          isActive || open
            ? 'border-[var(--violet-600)] bg-[var(--violet-600)] text-white'
            : 'border-[var(--border)] bg-white text-[var(--violet-900)] hover:bg-[var(--violet-50)]'
        }`}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label="정렬 옵션 열기"
      >
        <ArrowUpDown size={13} strokeWidth={1.75} aria-hidden />
        {buttonLabel}
        {open ? <ChevronUp size={13} strokeWidth={1.75} aria-hidden /> : <ChevronDown size={13} strokeWidth={1.75} aria-hidden />}
      </button>

      {mounted && open && coords
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[60] w-56 rounded-[8px] border border-[var(--border)] bg-white p-3 shadow-lg"
              style={{top: coords.top, right: coords.right}}
              role="dialog"
              aria-label="정렬 옵션"
            >
              <p className="mb-2 text-xs font-semibold text-[var(--violet-800)]">정렬 기준</p>
              <div className="flex flex-col gap-1">
                {sortFieldOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`flex h-9 items-center rounded-[6px] px-3 text-sm font-semibold transition ${
                      filters.sortField === value
                        ? 'bg-[var(--violet-100)] text-[var(--violet-900)]'
                        : 'text-slate-600 hover:bg-[var(--violet-50)]'
                    }`}
                    onClick={() => onChange({...filters, sortField: value})}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="mb-2 mt-3 text-xs font-semibold text-[var(--violet-800)]">정렬 방향</p>
              <div className="grid grid-cols-2 gap-1">
                {(['asc', 'desc'] as SortDirection[]).map(dir => (
                  <button
                    key={dir}
                    type="button"
                    disabled={filters.sortField === 'default'}
                    className={`inline-flex h-9 items-center justify-center gap-1 rounded-[6px] border px-2 text-sm font-semibold transition disabled:opacity-40 ${
                      filters.sortDirection === dir
                        ? 'border-[var(--violet-600)] bg-[var(--violet-600)] text-white'
                        : 'border-[var(--border)] bg-white text-[var(--violet-900)] hover:bg-[var(--violet-50)]'
                    }`}
                    onClick={() => onChange({...filters, sortDirection: dir})}
                  >
                    {dir === 'asc' ? (
                      <ArrowUpNarrowWide size={14} strokeWidth={1.75} aria-hidden />
                    ) : (
                      <ArrowDownWideNarrow size={14} strokeWidth={1.75} aria-hidden />
                    )}
                    {sortDirectionLabels[filters.sortField][dir]}
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

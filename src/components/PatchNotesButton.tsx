'use client';

import {Megaphone, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

import {useBodyScrollLock} from '@/hooks/useBodyScrollLock';
import {PATCH_NOTES, type PatchNote} from '@/lib/patch-notes/data';
import {
  hasUnseenPatchNotes,
  latestPatchDate,
  PATCH_NOTES_SEEN_STORAGE_KEY,
} from '@/lib/patch-notes/unseen';

// 상단 메뉴의 패치노트 버튼. 누르면 업데이트 내역 목록을 모달로 띄우고,
// 각 항목을 누르면 상세 내용을 펼쳐 보여준다.
// 안 읽은 새 패치가 있으면 버튼에 빨간 알림 점을 띄우고, 열면 사라진다.
export function PatchNotesButton({className = ''}: {className?: string}) {
  const [open, setOpen] = useState(false);
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    const lastSeen = window.localStorage.getItem(PATCH_NOTES_SEEN_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasUnseenPatchNotes(PATCH_NOTES, lastSeen)) setHasUnseen(true);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    // 최신 패치 날짜를 "확인함"으로 저장 → 알림 점 제거
    const latest = latestPatchDate(PATCH_NOTES);
    if (latest) window.localStorage.setItem(PATCH_NOTES_SEEN_STORAGE_KEY, latest);
    setHasUnseen(false);
  };

  return (
    <>
      <button
        className={`relative ${className}`}
        type="button"
        onClick={handleOpen}
        aria-label={hasUnseen ? '패치노트 (새 업데이트 있음)' : '패치노트'}
        title="패치노트"
      >
        <Megaphone size={14} strokeWidth={1.75} aria-hidden />
        패치노트
        {hasUnseen ? (
          <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--violet-500)] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--violet-600)]" />
          </span>
        ) : null}
      </button>
      {open ? <PatchNotesModal notes={PATCH_NOTES} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function PatchNotesModal({notes, onClose}: {notes: PatchNote[]; onClose: () => void}) {
  const [mounted, setMounted] = useState(false);
  // 처음에는 요약만 보이고, 선택한 항목만 상세를 펼친다.
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[var(--violet-950)]/45 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="패치노트"
      onClick={onClose}
    >
      <section
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[12px] bg-white shadow-[0_28px_90px_rgba(47,13,104,0.26)]"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--violet-950)]">
            <Megaphone size={18} strokeWidth={1.75} aria-hidden />
            패치노트
          </h2>
          <button
            className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-500 hover:bg-[var(--violet-50)]"
            type="button"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {notes.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">아직 업데이트 내역이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {notes.map(note => {
                const isOpen = expandedDate === note.date;
                return (
                  <li key={note.date} className="overflow-hidden rounded-[10px] border border-[var(--border)]">
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--violet-50)]"
                      type="button"
                      onClick={() => setExpandedDate(isOpen ? null : note.date)}
                      aria-expanded={isOpen}
                    >
                      <span className="shrink-0 rounded-full bg-[var(--violet-100)] px-2 py-0.5 text-[11px] font-bold text-[var(--violet-800)]">
                        {note.date}
                      </span>
                      <span className="min-w-0 flex-1 break-keep text-sm font-semibold text-[var(--violet-950)]">
                        {note.title}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-[var(--violet-400)]">
                        {isOpen ? '접기' : '자세히'}
                      </span>
                    </button>
                    {isOpen ? (
                      <ul className="space-y-1.5 border-t border-[var(--border)] bg-[var(--surface-muted)] px-5 py-3">
                        {note.details.map((detail, index) => (
                          <li key={index} className="flex gap-2 break-keep text-sm leading-6 text-slate-700">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--violet-400)]" aria-hidden />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

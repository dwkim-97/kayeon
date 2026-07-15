'use client';

/* eslint-disable @next/next/no-img-element */

import {useState} from 'react';

import {closedAlertState, CustomAlert, type CustomAlertState} from '@/components/CustomAlert';
import {formatBirthYearLabel} from '@/lib/profiles/age';
import {canNativeShareFiles, urlsToFiles} from '@/lib/profiles/native-share';
import {PARTNER_THUMB_WIDTH, photoThumbnailUrl} from '@/lib/profiles/photo-url';
import {buildPairShareText} from '@/lib/profiles/share-text';
import type {Profile} from '@/types/profile';

export function PairActionModal({female, male, officeMode = false, onMatch, onClose}: {
  female: Profile;
  male: Profile;
  officeMode?: boolean;
  onMatch: (femaleId: string, maleId: string) => void;
  onClose: () => void;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [alertState, setAlertState] = useState<CustomAlertState>(closedAlertState);

  const handleApply = async () => {
    setIsBusy(true);
    try {
      const text = buildPairShareText(female, male);
      try { await navigator.clipboard.writeText(text); } catch { /* non-fatal */ }
      const files = await urlsToFiles([...female.photos, ...male.photos].map(p => p.url));
      if (files.length > 0 && canNativeShareFiles(files[0])) {
        try { await navigator.share({files}); } catch { setIsBusy(false); return; }
        setAlertState({kind: 'alert', title: '정보가 복사됐어요', message: '사진을 보낸 채팅방에 길게 눌러 붙여넣기 하면 두 분 정보가 함께 전달됩니다.'});
      } else {
        for (const file of files) {
          const url = URL.createObjectURL(file);
          const a = document.createElement('a');
          a.href = url; a.download = file.name; a.click();
          URL.revokeObjectURL(url);
        }
        setAlertState({kind: 'alert', title: '정보가 복사됐어요', message: files.length > 0 ? '사진이 다운로드됐어요. 카카오톡에 첨부하고 붙여넣기 하세요.' : '정보가 클립보드에 복사됐어요.'});
      }
    } finally {
      setIsBusy(false);
    }
  };

  const mini = (p: Profile) => (
    <div className="flex flex-1 items-center gap-2 rounded-[8px] border border-[var(--border)] p-2">
      <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-[var(--violet-100)]">
        {p.photos[0] ? <img className="h-full w-full object-cover" src={photoThumbnailUrl(p.photos[0].url, PARTNER_THUMB_WIDTH)} alt={p.photos[0].alt} /> : <span className="text-[9px] text-slate-400">없음</span>}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-[var(--violet-900)]">{formatBirthYearLabel(p.birthYear)}</span>
        <span className="block truncate text-xs text-slate-500">{p.residence} · {p.job}</span>
      </span>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-[65] grid place-items-center bg-black/70 p-4 ${officeMode ? 'office-mode' : ''}`} role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-md rounded-[12px] bg-white p-5 shadow-sm" onClick={e => e.stopPropagation()}>
        <h2 className="mb-3 text-base font-bold text-[var(--violet-950)]">두 매물 연결</h2>
        <div className="flex items-center gap-2">
          {mini(female)}
          <span className="shrink-0 text-lg" aria-hidden>💞</span>
          {mini(male)}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="flex-1 rounded-[8px] bg-pink-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-pink-600" onClick={() => { onMatch(female.id, male.id); onClose(); }}>💞 매칭</button>
          <button type="button" className="flex-1 rounded-[8px] border border-[var(--violet-200)] px-4 py-2.5 text-sm font-bold text-[var(--violet-700)] hover:bg-[var(--violet-50)] disabled:opacity-60" onClick={handleApply} disabled={isBusy}>📋 지원(정보 복사)</button>
        </div>
        <button type="button" className="mt-3 w-full rounded-[8px] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-slate-500" onClick={onClose}>닫기</button>
      </div>
      <CustomAlert state={alertState} onClose={() => setAlertState(closedAlertState)} />
    </div>
  );
}

'use client';

import {Send} from 'lucide-react';
import {useState} from 'react';

import {closedAlertState, CustomAlert, type CustomAlertState} from '@/components/CustomAlert';
import {canNativeShareFiles, urlsToFiles} from '@/lib/profiles/native-share';
import {buildShareText} from '@/lib/profiles/share-text';
import type {Profile} from '@/types/profile';

// "자연스러운 공유" — 사진을 Web Share로 묶어 보내고 정보 텍스트는 클립보드에 복사.
// 카카오 카드 공유와 별개로, 사람이 직접 앨범+텍스트를 보낸 것처럼 전송한다.
export function NaturalShareButton({profile}: {profile: Profile}) {
  const [isBusy, setIsBusy] = useState(false);
  const [alertState, setAlertState] = useState<CustomAlertState>(closedAlertState);

  const handleClick = async () => {
    setIsBusy(true);
    try {
      const text = buildShareText(profile);
      // 텍스트는 항상 클립보드에 복사(iOS 카톡이 share text를 누락하는 경우 대비)
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // 클립보드 실패는 치명적이지 않음 — 공유는 계속 진행
      }

      const files = await urlsToFiles(profile.photos.map(p => p.url));

      if (files.length > 0 && canNativeShareFiles(files[0])) {
        try {
          await navigator.share({files});
        } catch {
          // 사용자가 공유 시트를 취소한 경우 등 — 조용히 무시
          setIsBusy(false);
          return;
        }
        setAlertState({
          kind: 'alert',
          title: '정보가 복사됐어요',
          message: '사진을 보낸 채팅방에 길게 눌러 붙여넣기 하면 정보가 함께 전달됩니다.',
        });
      } else {
        // 데스크톱/파일 공유 미지원 — 사진 다운로드 + 텍스트는 이미 복사됨
        for (const file of files) {
          const url = URL.createObjectURL(file);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
        }
        setAlertState({
          kind: 'alert',
          title: '정보가 복사됐어요',
          message:
            files.length > 0
              ? '사진이 다운로드됐어요. 카카오톡에 사진을 첨부하고 붙여넣기 하세요.'
              : '정보가 클립보드에 복사됐어요. 채팅방에 붙여넣기 하세요.',
        });
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <button
        className="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-[var(--violet-200)] bg-white px-3.5 text-sm font-bold text-[var(--violet-700)] shadow-sm transition hover:bg-[var(--violet-50)] disabled:opacity-60"
        type="button"
        onClick={handleClick}
        disabled={isBusy}
      >
        {isBusy ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--violet-300)] border-t-[var(--violet-600)]" />
        ) : (
          <Send size={15} aria-hidden />
        )}
        자연스러운 공유
      </button>
      <CustomAlert state={alertState} onClose={() => setAlertState(closedAlertState)} />
    </>
  );
}

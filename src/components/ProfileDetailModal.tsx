'use client';

/* eslint-disable @next/next/no-img-element */

import {Pencil, X} from 'lucide-react';
import {useEffect, useRef, useState, type TouchEvent} from 'react';

import {NaturalShareButton} from '@/components/NaturalShareButton';
import {PhotoSlider} from '@/app/profiles/[id]/PhotoSlider';
import {useBodyScrollLock} from '@/hooks/useBodyScrollLock';
import {formatBirthYearLabel} from '@/lib/profiles/age';
import {getMatchCandidates, getProfileMatches} from '@/lib/matches/summary';
import {getAdminInformationRows, getProfileInformationRows} from '@/lib/profiles/information';
import {genderLabels} from '@/lib/profiles/options';
import {PARTNER_THUMB_WIDTH, photoThumbnailUrl} from '@/lib/profiles/photo-url';
import type {Match} from '@/types/match';
import type {Profile} from '@/types/profile';

type ProfileDetailModalProps = {
  profile: Profile;
  matches: Match[];
  allProfiles: Profile[];
  officeMode?: boolean;
  onCreateMatch: (femaleId: string, maleId: string) => void;
  onEndMatch: (matchId: string) => void;
  onDeleteMatch: (matchId: string) => void;
  onOpenProfile: (profileId: string) => void;
  onEdit: (profile: Profile) => void;
  onClose: () => void;
};

export function ProfileDetailModal({
  profile,
  matches,
  allProfiles,
  officeMode = false,
  onCreateMatch,
  onEndMatch,
  onDeleteMatch,
  onOpenProfile,
  onEdit,
  onClose,
}: ProfileDetailModalProps) {
  const [showCandidates, setShowCandidates] = useState(false);
  const informationRows = getProfileInformationRows(profile);
  const adminRows = getAdminInformationRows(profile);
  const title = `${genderLabels[profile.gender]} · ${formatBirthYearLabel(profile.birthYear)}`;
  const profileMatches = getProfileMatches(profile.id, matches);
  const candidates = getMatchCandidates(profile, allProfiles);

  // 스크롤 컨테이너(모바일 세로 스크롤) + 아래로 쓸어내려 닫기 제스처용
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const swipeStart = useRef<{x: number; y: number; atTop: boolean} | null>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // 폰 뒤로가기(가장자리 스와이프/버튼)로 이전 페이지로 나가지 않고 모달만 닫는다.
  // 마운트 시 더미 히스토리 항목을 넣고, popstate(뒤로가기) 때 onClose를 호출한다.
  useEffect(() => {
    window.history.pushState({kayeonDetailModal: true}, '');
    const onPopState = () => onClose();
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      // 정상 닫기(X/스와이프/Escape)로 언마운트된 경우, 우리가 넣은 항목을 되돌린다.
      // popstate로 닫힌 경우엔 이미 항목이 소비됐으므로 back()이 실제 페이지 이동을
      // 유발하지 않도록 우리 상태일 때만 되돌린다.
      if (window.history.state?.kayeonDetailModal) window.history.back();
    };
  }, [onClose]);

  // 아래로 쓸어내려 닫기 — 스크롤 최상단에서 시작한 수직 아래 스와이프만 처리
  // (사진 슬라이더의 좌우 스와이프·본문 세로 스크롤과 충돌하지 않게).
  const SWIPE_DOWN_THRESHOLD = 90;

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    const atTop = (scrollRef.current?.scrollTop ?? 0) <= 0;
    swipeStart.current = {x: touch.clientX, y: touch.clientY, atTop};
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || !start.atTop) return;
    const touch = event.changedTouches[0];
    const dy = touch.clientY - start.y;
    const dx = touch.clientX - start.x;
    // 아래로 충분히, 그리고 수평보다 수직 이동이 클 때만 닫기
    if (dy > SWIPE_DOWN_THRESHOLD && dy > Math.abs(dx)) onClose();
  };

  const handleCreate = (partner: Profile) => {
    const femaleId = profile.gender === 'female' ? profile.id : partner.id;
    const maleId = profile.gender === 'female' ? partner.id : profile.id;
    onCreateMatch(femaleId, maleId);
    setShowCandidates(false);
  };

  return (
    <div
      className={`fixed inset-0 z-[60] grid place-items-center bg-black/70 p-0 sm:p-4 ${
        officeMode ? 'office-mode' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} 상세 정보`}
      onClick={onClose}
    >
      <section
        ref={scrollRef}
        className="relative flex h-full w-full max-w-6xl flex-col overflow-y-auto bg-white shadow-sm sm:h-[90vh] sm:rounded-[12px] md:flex-row md:overflow-hidden"
        onClick={event => event.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* 항상 보이는 닫기 버튼 (좌상단 오버레이) — 모바일/PC 공통 */}
        <button
          className="absolute left-3 top-3 z-40 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
          type="button"
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={20} strokeWidth={1.75} aria-hidden />
        </button>

        {/* 좌측(PC) / 상단(모바일): 사진 슬라이더 — 모바일에서는 고정하지 않고 함께 스크롤 */}
        <div className="relative aspect-[4/5] w-full shrink-0 bg-black sm:aspect-auto sm:h-[52vh] md:h-full md:w-[62%]">
          {/* infoRows는 우측 패널에서 보여주므로 슬라이더 내부 오버레이는 비운다 */}
          <PhotoSlider photos={profile.photos} infoRows={[]} />

          {/* 하단 우측: 집착매물 뱃지 */}
          {profile.starredByName ? (
            <div className="pointer-events-none absolute bottom-4 right-4 z-30 flex items-center gap-1 whitespace-nowrap rounded-full bg-yellow-400/95 px-3 py-1.5 text-xs font-bold text-yellow-900 shadow-sm">
              ⭐️ {profile.starredByName}의 집착매물
            </div>
          ) : null}
        </div>

        {/* 우측(PC) / 하단(모바일): 전체 정보 + 매칭 허브 */}
        <div className="flex min-h-0 flex-1 flex-col md:w-[38%]">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-lg font-bold text-[var(--violet-950)]">{title}</h2>
            {/* 상세보기에서 바로 수정 / 자연스러운 공유 */}
            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-white px-3.5 text-sm font-bold text-[var(--violet-800)] shadow-sm transition hover:bg-[var(--violet-50)]"
                type="button"
                onClick={() => onEdit(profile)}
              >
                <Pencil size={15} strokeWidth={1.75} aria-hidden />
                수정
              </button>
              <NaturalShareButton profile={profile} />
            </div>
          </header>

          <div className="min-h-0 flex-1 md:overflow-y-auto">
            {/* 전체 정보 */}
            <div className="border-b border-[var(--border)] px-5 py-4">
              <ul className="space-y-2">
                {informationRows.map(([label, value]) => (
                  <li
                    key={label}
                    className="grid grid-cols-[96px_1fr] overflow-hidden rounded-[8px] border border-[var(--border)] text-sm"
                  >
                    <span className="border-r border-[var(--border)] bg-[var(--violet-50)] px-3 py-2.5 font-semibold text-[var(--violet-900)]">
                      {label}
                    </span>
                    <span className="break-keep px-3 py-2.5 leading-6 text-slate-700">{value}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 관리자 전용 항목: 떠보기/거절내성/응답속도. 값 있을 때만. */}
            {adminRows.length > 0 ? (
              <div className="border-b border-[var(--border)] px-5 py-4">
                <div className="rounded-[8px] border border-amber-300 bg-amber-50 px-4 py-3">
                  <h3 className="mb-2 flex items-center gap-1 text-xs font-bold text-amber-700">
                    <span aria-hidden>🔒</span> 관리자 전용
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {adminRows
                      .filter(([label]) => label !== '리워드')
                      .map(([label, value]) => (
                        <li
                          key={label}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900"
                        >
                          <span className="text-amber-600">{label}</span>
                          <span>{value}</span>
                        </li>
                      ))}
                  </ul>
                  {adminRows
                    .filter(([label]) => label === '리워드')
                    .map(([, value]) => (
                      <p key="reward" className="mt-2 flex items-center gap-1.5 break-keep text-sm font-semibold text-amber-900">
                        <span aria-hidden>🎁</span>
                        <span>{value}</span>
                      </p>
                    ))}
                </div>
              </div>
            ) : null}

            {/* 관리자 메모: 주선자 전용. 눈에 띄도록 amber 톤으로 구분. 값 있을 때만. */}
            {profile.adminMemo ? (
              <div className="border-b border-[var(--border)] px-5 py-4">
                <div className="rounded-[8px] border border-amber-300 bg-amber-50 px-4 py-3">
                  <h3 className="mb-1 flex items-center gap-1 text-xs font-bold text-amber-700">
                    <span aria-hidden>📝</span> 관리자 메모
                  </h3>
                  <p className="whitespace-pre-wrap break-keep text-sm leading-6 text-amber-900">
                    {profile.adminMemo}
                  </p>
                </div>
              </div>
            ) : null}

            {/* 매칭 현황 */}
            <div className="px-5 py-4">
              <h3 className="mb-2 text-sm font-bold text-[var(--violet-900)]">매칭 현황</h3>
              {profileMatches.length === 0 ? (
                <p className="text-sm text-slate-400">아직 연결된 매칭이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {profileMatches.map(m => {
                    const partnerId = m.femaleId === profile.id ? m.maleId : m.femaleId;
                    const partner = allProfiles.find(p => p.id === partnerId);
                    return (
                      <li
                        key={m.id}
                        className="flex items-center gap-2 rounded-[8px] border border-[var(--border)] px-3 py-2 text-sm"
                      >
                        <PartnerThumb partner={partner} />
                        <button
                          className="min-w-0 flex-1 truncate text-left font-semibold text-[var(--violet-900)] hover:underline disabled:no-underline"
                          type="button"
                          disabled={!partner}
                          onClick={() => partner && onOpenProfile(partner.id)}
                        >
                          {partner
                            ? `${formatBirthYearLabel(partner.birthYear)} · ${partner.residence}`
                            : '(삭제된 매물)'}
                        </button>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            m.status === 'ongoing' ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {m.status === 'ongoing' ? '진행중' : '종료'}
                        </span>
                        {m.status === 'ongoing' ? (
                          <button
                            className="shrink-0 rounded-[6px] border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            type="button"
                            onClick={() => onEndMatch(m.id)}
                          >
                            종료
                          </button>
                        ) : null}
                        <button
                          className="shrink-0 rounded-[6px] border border-red-100 px-2 py-1 text-xs font-semibold text-[var(--danger)] hover:bg-red-50"
                          type="button"
                          onClick={() => onDeleteMatch(m.id)}
                        >
                          삭제
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {showCandidates ? (
                <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-[8px] border border-[var(--border)] p-2">
                  <p className="px-1 pb-1 text-xs font-semibold text-slate-400">
                    {profile.gender === 'female' ? '남성' : '여성'} 매물을 선택하면 바로 연결됩니다
                  </p>
                  {candidates.length === 0 ? (
                    <p className="p-2 text-sm text-slate-400">연결 가능한 이성 매물이 없습니다.</p>
                  ) : (
                    candidates.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-sm hover:bg-[var(--violet-50)]"
                        onClick={() => handleCreate(c)}
                      >
                        <PartnerThumb partner={c} />
                        <span className="min-w-0 flex-1 truncate">
                          {formatBirthYearLabel(c.birthYear)} · {c.residence} · {c.job}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <button
                  className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--violet-600)] px-3 text-sm font-semibold text-white hover:bg-[var(--violet-700)]"
                  type="button"
                  onClick={() => setShowCandidates(true)}
                >
                  + 매칭 추가
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// 매칭 상대 대표사진(첫 장) 썸네일. 사진이 없거나 삭제된 매물이면 플레이스홀더.
function PartnerThumb({partner}: {partner: Profile | undefined}) {
  const photo = partner?.photos[0];
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-[var(--violet-100)]">
      {photo ? (
        <img className="h-full w-full object-cover" src={photoThumbnailUrl(photo.url, PARTNER_THUMB_WIDTH)} alt={photo.alt} draggable={false} />
      ) : (
        <span className="text-[9px] font-semibold text-slate-400">없음</span>
      )}
    </span>
  );
}

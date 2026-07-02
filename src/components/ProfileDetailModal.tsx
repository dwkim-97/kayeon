'use client';

import {X} from 'lucide-react';
import {useEffect, useState} from 'react';

import {PhotoSlider} from '@/app/profiles/[id]/PhotoSlider';
import {useBodyScrollLock} from '@/hooks/useBodyScrollLock';
import {formatBirthYearLabel} from '@/lib/profiles/age';
import {getMatchCandidates, getProfileMatches} from '@/lib/matches/summary';
import {getAdditionalInformationRows} from '@/lib/profiles/information';
import {genderLabels} from '@/lib/profiles/options';
import type {Match} from '@/types/match';
import type {Profile} from '@/types/profile';

type ProfileDetailModalProps = {
  profile: Profile;
  matches: Match[];
  allProfiles: Profile[];
  onCreateMatch: (femaleId: string, maleId: string) => void;
  onEndMatch: (matchId: string) => void;
  onDeleteMatch: (matchId: string) => void;
  onOpenProfile: (profileId: string) => void;
  onClose: () => void;
};

export function ProfileDetailModal({
  profile,
  matches,
  allProfiles,
  onCreateMatch,
  onEndMatch,
  onDeleteMatch,
  onOpenProfile,
  onClose,
}: ProfileDetailModalProps) {
  const [showCandidates, setShowCandidates] = useState(false);
  const title = `${genderLabels[profile.gender]} · ${formatBirthYearLabel(profile.birthYear)}`;
  const profileMatches = getProfileMatches(profile.id, matches);
  const candidates = getMatchCandidates(profile, allProfiles);
  const additionalRows = getAdditionalInformationRows(profile);

  useBodyScrollLock(true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleCreate = (partner: Profile) => {
    const femaleId = profile.gender === 'female' ? profile.id : partner.id;
    const maleId = profile.gender === 'female' ? partner.id : profile.id;
    onCreateMatch(femaleId, maleId);
    setShowCandidates(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} 상세 정보`}
      onClick={onClose}
    >
      <section
        className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[90vh] sm:rounded-[12px] md:flex-row"
        onClick={event => event.stopPropagation()}
      >
        {/* 좌측(PC) / 상단(모바일): 사진 + 정보 오버레이 */}
        <div className="relative h-[52vh] w-full shrink-0 bg-black sm:h-[58vh] md:h-full md:w-[58%]">
          <PhotoSlider photos={profile.photos} infoRows={[]} />

          {/* 상단 우측: 주선자(등록자) */}
          <div className="pointer-events-none absolute right-4 top-4 z-30 rounded-full bg-black/45 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
            주선자 · {profile.authorName}
          </div>

          {/* 하단: 그라데이션 + 핵심 정보 오버레이 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-5 pb-6 pt-24">
            <p className="text-2xl font-black leading-tight text-white drop-shadow">
              {formatBirthYearLabel(profile.birthYear)} / {profile.height}cm
            </p>
            <p className="mt-1 break-keep text-base font-semibold text-white/90 drop-shadow">
              {profile.residence} 거주 · {profile.job}
            </p>
            {profile.starredByName ? (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-yellow-400/95 px-2.5 py-1 text-xs font-black text-yellow-900">
                ⭐️ {profile.starredByName}의 집착매물
              </span>
            ) : null}
          </div>
        </div>

        {/* 우측(PC) / 하단(모바일): 추가 정보 + 매칭 허브 */}
        <div className="flex min-h-0 flex-1 flex-col md:w-[42%]">
          <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-lg font-black text-[var(--violet-950)]">{title}</h2>
            <button
              className="grid h-9 w-9 place-items-center rounded-[8px] text-slate-500 hover:bg-[var(--violet-50)]"
              type="button"
              onClick={onClose}
              aria-label="닫기"
            >
              <X size={20} aria-hidden />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* 추가 정보 */}
            <div className="border-b border-[var(--border)] px-5 py-4">
              <ul className="space-y-2">
                {additionalRows.map(([label, value]) => (
                  <li
                    key={label}
                    className="grid grid-cols-[88px_1fr] overflow-hidden rounded-[8px] border border-[var(--violet-100)] text-sm"
                  >
                    <span className="border-r border-[var(--violet-100)] bg-[var(--violet-50)] px-3 py-2 font-bold text-[var(--violet-900)]">
                      {label}
                    </span>
                    <span className="break-keep px-3 py-2 leading-6 text-slate-700">{value}</span>
                  </li>
                ))}
                {additionalRows.length === 0 ? (
                  <li className="list-none text-sm text-slate-400">추가 정보가 없습니다.</li>
                ) : null}
              </ul>
            </div>

            {/* 매칭 현황 */}
            <div className="px-5 py-4">
              <h3 className="mb-2 text-sm font-black text-[var(--violet-900)]">매칭 현황</h3>
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
                        className="flex items-center gap-2 rounded-[8px] border border-[var(--violet-100)] px-3 py-2 text-sm"
                      >
                        <button
                          className="min-w-0 flex-1 truncate text-left font-bold text-[var(--violet-900)] hover:underline disabled:no-underline"
                          type="button"
                          disabled={!partner}
                          onClick={() => partner && onOpenProfile(partner.id)}
                        >
                          {partner
                            ? `${formatBirthYearLabel(partner.birthYear)} · ${partner.residence}`
                            : '(삭제된 매물)'}
                        </button>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                            m.status === 'ongoing' ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {m.status === 'ongoing' ? '진행중' : '종료'}
                        </span>
                        {m.status === 'ongoing' ? (
                          <button
                            className="shrink-0 rounded-[6px] border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                            type="button"
                            onClick={() => onEndMatch(m.id)}
                          >
                            종료
                          </button>
                        ) : null}
                        <button
                          className="shrink-0 rounded-[6px] border border-red-100 px-2 py-1 text-xs font-bold text-[var(--danger)] hover:bg-red-50"
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
                <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-[8px] border border-[var(--violet-100)] p-2">
                  <p className="px-1 pb-1 text-xs font-bold text-slate-400">
                    {profile.gender === 'female' ? '남성' : '여성'} 매물을 선택하면 바로 연결됩니다
                  </p>
                  {candidates.length === 0 ? (
                    <p className="p-2 text-sm text-slate-400">연결 가능한 이성 매물이 없습니다.</p>
                  ) : (
                    candidates.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="block w-full truncate rounded-[6px] px-2 py-1.5 text-left text-sm hover:bg-[var(--violet-50)]"
                        onClick={() => handleCreate(c)}
                      >
                        {formatBirthYearLabel(c.birthYear)} · {c.residence} · {c.job}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <button
                  className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--violet-600)] px-3 text-sm font-bold text-white hover:bg-[var(--violet-700)]"
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

'use client';

/* eslint-disable @next/next/no-img-element */

import {ChevronLeft, ChevronRight, Eye, EyeOff, Pencil, Trash2} from 'lucide-react';
import {useState} from 'react';

import {formatBirthYearLabel} from '@/lib/profiles/age';
import type {Profile} from '@/types/profile';

export type ProfileCardVariant = 'detailed' | 'compact';

type ProfileCardProps = {
  profile: Profile;
  authorName: string;
  isSelected: boolean;
  onSelectChange: (profileId: string, selected: boolean) => void;
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
  onStatusChange: (profileId: string, status: Profile['status']) => void;
  onToggleStar: (profile: Profile) => void;
  onOpenDetail: (profile: Profile) => void;
  variant?: ProfileCardVariant;
  isEditMode?: boolean;
  ongoingMatchCount?: number;
};

function StarButton({
  profile,
  authorName,
  onClick,
}: {
  profile: Profile;
  authorName: string;
  onClick: () => void;
}) {
  const {starredByName} = profile;
  const isMystar = starredByName === authorName;
  const isOtherStar = !!starredByName && !isMystar;

  if (isOtherStar) {
    return (
      <button
        className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/90 px-2 py-1 shadow-sm"
        type="button"
        disabled
        title={`${starredByName}님의 집착매물`}
        aria-label="다른 사람이 지정한 집착매물"
      >
        <StarIcon filled color="gray" />
      </button>
    );
  }

  return (
    <button
      className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/90 px-2 py-1 shadow-sm transition hover:scale-110"
      type="button"
      onClick={onClick}
      aria-label={isMystar ? '집착매물 해제' : '집착매물 지정'}
    >
      <StarIcon filled={isMystar} color={isMystar ? 'yellow' : 'gray'} />
    </button>
  );
}

function StarIcon({filled, color}: {filled: boolean; color: 'yellow' | 'gray'}) {
  const fill = filled ? (color === 'yellow' ? '#FBBF24' : '#9CA3AF') : 'none';
  const stroke = color === 'yellow' ? '#F59E0B' : '#9CA3AF';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function ProfileCard({
  profile,
  authorName,
  isSelected,
  onSelectChange,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleStar,
  onOpenDetail,
  variant = 'detailed',
  isEditMode = false,
  ongoingMatchCount = 0,
}: ProfileCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const hasMultiplePhotos = profile.photos.length > 1;
  const isBlocked = !profile.isActivated;
  const isCompact = variant === 'compact';
  const birthYearLabel = formatBirthYearLabel(profile.birthYear);
  const isStarred = !!profile.starredByName;
  // compact: 년생 / 키 / 사는 곳 / 회사 를 한 줄로 요약 (빈 값은 제외)
  const compactSummary = [birthYearLabel, `${profile.height}cm`, profile.residence, profile.job]
    .filter(part => part && part.trim().length > 0)
    .join(' / ');

  const movePhoto = (direction: -1 | 1) => {
    setPhotoIndex(current => (current + direction + profile.photos.length) % profile.photos.length);
  };

  return (
    <article className="relative">
      {/* 좌측 상단: 체크박스 */}
      <label
        className={`absolute -left-1.5 -top-1.5 z-20 grid place-items-center rounded-[7px] border border-[var(--violet-200)] bg-white shadow-sm ${
          isCompact ? 'h-6 w-6' : 'h-8 w-8'
        } ${isBlocked ? 'opacity-55' : ''}`}
      >
        <input
          className={`accent-[var(--violet-600)] ${isCompact ? 'h-4 w-4' : 'h-5 w-5'}`}
          type="checkbox"
          checked={!isBlocked && isSelected}
          disabled={isBlocked}
          onChange={event => onSelectChange(profile.id, event.target.checked)}
          aria-label={`${birthYearLabel} 매물 선택`}
        />
      </label>

      <div
        className={`relative overflow-hidden rounded-[8px] bg-white transition ${
          isStarred
            ? 'border-4 border-yellow-400 shadow-[0_0_0_2px_rgba(251,191,36,0.35),0_18px_45px_rgba(202,138,4,0.25)]'
            : !isBlocked && isSelected
              ? 'border-4 border-[var(--violet-600)] shadow-[0_18px_45px_rgba(47,13,104,0.10)]'
              : 'border border-[var(--border)] shadow-[0_18px_45px_rgba(47,13,104,0.10)]'
        } ${isBlocked ? 'grayscale' : ''}`}
      >
        {isBlocked ? <div className="absolute inset-0 z-10 bg-slate-200/65" aria-hidden /> : null}

        <div className={`relative ${isCompact ? 'aspect-square' : 'aspect-[4/5]'} bg-[var(--violet-100)]`}>
          {profile.photos.length > 0 ? (
            <>
              {profile.photos.map((p, i) => (
                <img
                  key={p.id}
                  className="absolute inset-0 h-full w-full select-none object-cover"
                  src={p.url}
                  alt={p.alt}
                  draggable={false}
                  style={{opacity: i === photoIndex ? 1 : 0}}
                />
              ))}
              <button
                className="absolute inset-0 z-10 cursor-pointer"
                type="button"
                onClick={() => onOpenDetail(profile)}
                aria-label="상세 정보 보기"
              />
            </>
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-500">사진 없음</div>
          )}

          {/* 주선자 뱃지 — compact: 좌하단 / detailed: 우상단 */}
          <div
            className={`absolute z-20 rounded-full bg-white/92 font-bold text-[var(--violet-800)] shadow-sm ${
              isCompact ? 'bottom-3 left-3 px-2 py-0.5 text-[10px]' : 'right-3 top-3 px-3 py-1 text-xs'
            }`}
          >
            {profile.authorName}
          </div>

          {/* 진행중 매칭 배지 — compact: 우상단 / detailed: 좌상단(주선자와 겹치지 않게) */}
          {ongoingMatchCount > 0 ? (
            <div
              className={`absolute top-3 z-20 rounded-full bg-pink-500/90 font-black text-white shadow-sm ${
                isCompact ? 'right-3 px-2 py-0.5 text-[10px]' : 'left-3 px-2.5 py-1 text-xs'
              }`}
            >
              💞 매칭 {ongoingMatchCount}
            </div>
          ) : null}

          {/* detailed: 사진 하단에 핵심 정보 오버레이 (그라데이션 위) */}
          {!isCompact ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-3 pt-16">
              <p className="text-lg font-black leading-tight text-white drop-shadow">
                {birthYearLabel} / {profile.height}cm
              </p>
              <p className="mt-0.5 break-keep text-sm font-semibold text-white/90 drop-shadow">
                {profile.residence} 거주 · {profile.job}
              </p>
            </div>
          ) : null}

          {/* 하단 중앙: 별 버튼 (편집 모드에서만) */}
          {isEditMode ? (
            <StarButton
              profile={profile}
              authorName={authorName}
              onClick={() => onToggleStar(profile)}
            />
          ) : null}

          {hasMultiplePhotos ? (
            <>
              <button
                className={`absolute left-2 top-1/2 z-20 grid -translate-y-1/2 place-items-center rounded-full bg-white/65 text-[var(--violet-900)] ${
                  isCompact ? 'h-6 w-6' : 'h-8 w-8'
                }`}
                type="button"
                onClick={e => { e.stopPropagation(); movePhoto(-1); }}
                aria-label="이전 사진"
              >
                <ChevronLeft size={isCompact ? 14 : 18} aria-hidden />
              </button>
              <button
                className={`absolute right-2 top-1/2 z-20 grid -translate-y-1/2 place-items-center rounded-full bg-white/65 text-[var(--violet-900)] ${
                  isCompact ? 'h-6 w-6' : 'h-8 w-8'
                }`}
                type="button"
                onClick={e => { e.stopPropagation(); movePhoto(1); }}
                aria-label="다음 사진"
              >
                <ChevronRight size={isCompact ? 14 : 18} aria-hidden />
              </button>
              <div
                className={`absolute bottom-3 right-3 z-20 rounded-full bg-black/55 font-bold text-white ${
                  isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
                }`}
              >
                {photoIndex + 1}/{profile.photos.length}
              </div>
            </>
          ) : null}
        </div>

        {/* 하단 영역: compact 요약 또는 편집 버튼이 있을 때만 렌더 (detailed 조회모드는 사진만) */}
        {isCompact || isEditMode ? (
        <div className={`relative z-20 ${isCompact ? 'p-2' : 'p-4'}`}>
          {/* compact: 사진 아래 슬래시 요약. detailed: 정보는 사진 위 오버레이에 표시됨 */}
          {isCompact ? (
            <p className="line-clamp-2 h-[42px] break-keep rounded-[6px] border border-[var(--violet-100)] bg-[var(--violet-50)] px-2 py-1 text-xs font-semibold leading-5 text-[var(--violet-900)]">
              {compactSummary}
            </p>
          ) : null}

          {isEditMode ? (
            <div className={`flex items-center justify-end ${isCompact ? 'mt-1.5 gap-1.5' : 'mt-2 gap-2'}`}>
              {/* 상태 토글: 활성이면 비활성화(EyeOff), 비활성이면 활성화(Eye) */}
              <button
                className={`mr-auto grid place-items-center rounded-[8px] border transition ${
                  isCompact ? 'h-8 w-8' : 'h-9 w-9'
                } ${
                  isBlocked
                    ? 'border-[var(--violet-300)] bg-[var(--violet-600)] text-white hover:bg-[var(--violet-700)]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                type="button"
                onClick={() => onStatusChange(profile.id, isBlocked ? 'active' : 'blocked')}
                aria-label={`${birthYearLabel} 매물 ${isBlocked ? '활성화' : '비활성화'}`}
                title={isBlocked ? '활성화' : '비활성화'}
              >
                {isBlocked ? <Eye size={isCompact ? 15 : 17} aria-hidden /> : <EyeOff size={isCompact ? 15 : 17} aria-hidden />}
              </button>
              <button
                className={`grid place-items-center rounded-[8px] border border-[var(--violet-200)] text-[var(--violet-800)] transition hover:bg-[var(--violet-50)] ${
                  isCompact ? 'h-8 w-8' : 'h-9 w-9'
                }`}
                type="button"
                onClick={() => onEdit(profile)}
                aria-label={`${birthYearLabel} 매물 수정`}
              >
                <Pencil size={isCompact ? 15 : 17} aria-hidden />
              </button>
              <button
                className={`grid place-items-center rounded-[8px] border border-red-100 text-[var(--danger)] transition hover:bg-red-50 ${
                  isCompact ? 'h-8 w-8' : 'h-9 w-9'
                }`}
                type="button"
                onClick={() => onDelete(profile)}
                aria-label={`${birthYearLabel} 매물 삭제`}
              >
                <Trash2 size={isCompact ? 15 : 17} aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
        ) : null}
      </div>
    </article>
  );
}

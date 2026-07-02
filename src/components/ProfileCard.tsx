'use client';

/* eslint-disable @next/next/no-img-element */

import {ChevronLeft, ChevronRight, Pencil, Trash2} from 'lucide-react';
import {useState} from 'react';

import {PhotoLightbox} from '@/components/PhotoLightbox';
import {formatBirthYearLabel} from '@/lib/profiles/age';
import {getProfileInformationRows} from '@/lib/profiles/information';
import type {Profile} from '@/types/profile';

type ProfileCardProps = {
  profile: Profile;
  authorName: string;
  isSelected: boolean;
  onSelectChange: (profileId: string, selected: boolean) => void;
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
  onStatusChange: (profileId: string, status: Profile['status']) => void;
  onToggleStar: (profile: Profile) => void;
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
        className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-white/90 px-2 py-1 shadow-sm"
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
      className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-white/90 px-2 py-1 shadow-sm transition hover:scale-110"
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
}: ProfileCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const hasMultiplePhotos = profile.photos.length > 1;
  const isBlocked = !profile.isActivated;
  const birthYearLabel = formatBirthYearLabel(profile.birthYear);
  const informationRows = getProfileInformationRows(profile);

  const movePhoto = (direction: -1 | 1) => {
    setPhotoIndex(current => (current + direction + profile.photos.length) % profile.photos.length);
  };

  return (
    <article className="relative">
      <label
        className={`absolute -left-1 -top-1 z-20 grid h-7 w-7 place-items-center rounded-[6px] border border-[var(--violet-200)] bg-white shadow-sm ${
          isBlocked ? 'opacity-55' : ''
        }`}
      >
        <input
          className="h-4 w-4 accent-[var(--violet-600)]"
          type="checkbox"
          checked={!isBlocked && isSelected}
          disabled={isBlocked}
          onChange={event => onSelectChange(profile.id, event.target.checked)}
          aria-label={`${birthYearLabel} 매물 선택`}
        />
      </label>

      <div
        className={`relative overflow-hidden rounded-[8px] border border-[var(--border)] bg-white shadow-[0_18px_45px_rgba(47,13,104,0.10)] transition ${
          isBlocked ? 'grayscale' : ''
        }`}
      >
        {isBlocked ? <div className="absolute inset-0 z-10 bg-slate-200/65" aria-hidden /> : null}

        {/* 좌측 상단: 등록자 */}
        <div className="absolute left-3 top-3 z-20 rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-[var(--violet-800)] shadow-sm">
          {profile.authorName}
        </div>

        {/* 중앙 상단: 집착매물 뱃지 or 별 버튼 */}
        {profile.starredByName ? (
          <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-yellow-400/90 px-2.5 py-1 text-xs font-black text-yellow-900 shadow-sm">
            ⭐️ {profile.starredByName}의 집착매물 ⭐️
          </div>
        ) : null}

        <StarButton
          profile={profile}
          authorName={authorName}
          onClick={() => onToggleStar(profile)}
        />

        {/* 우측 상단: 상태 토글 */}
        <button
          className={`absolute right-3 top-3 z-30 h-8 w-14 rounded-full p-1 transition ${
            isBlocked ? 'bg-slate-300' : 'bg-[var(--violet-600)]'
          }`}
          type="button"
          onClick={() => onStatusChange(profile.id, isBlocked ? 'active' : 'blocked')}
          aria-label={`${birthYearLabel} 매물 상태 변경`}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white shadow transition ${
              isBlocked ? 'translate-x-0' : 'translate-x-6'
            }`}
          />
        </button>

        <div className="relative aspect-[4/5] bg-[var(--violet-100)]">
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
                className="absolute inset-0 z-10 cursor-zoom-in"
                type="button"
                onClick={() => setLightboxIndex(photoIndex)}
                aria-label="사진 크게 보기"
              />
            </>
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-500">사진 없음</div>
          )}

          {hasMultiplePhotos ? (
            <>
              <button
                className="absolute left-2 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[var(--violet-900)]"
                type="button"
                onClick={e => { e.stopPropagation(); movePhoto(-1); }}
                aria-label="이전 사진"
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <button
                className="absolute right-2 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[var(--violet-900)]"
                type="button"
                onClick={e => { e.stopPropagation(); movePhoto(1); }}
                aria-label="다음 사진"
              >
                <ChevronRight size={18} aria-hidden />
              </button>
              <div className="absolute bottom-3 right-3 z-20 rounded-full bg-black/55 px-2 py-1 text-xs font-bold text-white">
                {photoIndex + 1}/{profile.photos.length}
              </div>
            </>
          ) : null}
        </div>

        <div className="relative z-20 p-4">
          <ul className="space-y-1.5 text-sm leading-6 text-slate-700">
            {informationRows.map(([label, value]) => (
              <li className="grid grid-cols-[88px_1fr] overflow-hidden rounded-[6px] border border-[var(--violet-100)]" key={label}>
                <span className="border-r border-[var(--violet-100)] bg-[var(--violet-50)] px-2 py-1 font-bold text-[var(--violet-900)]">
                  {label}
                </span>
                <span className="min-w-0 break-keep px-2 py-1 text-slate-700">{value}</span>
              </li>
            ))}
          </ul>

          <div className="flex justify-end gap-2">
            <button
              className="grid h-9 w-9 place-items-center rounded-[8px] border border-[var(--violet-200)] text-[var(--violet-800)] transition hover:bg-[var(--violet-50)]"
              type="button"
              onClick={() => onEdit(profile)}
              aria-label={`${birthYearLabel} 매물 수정`}
            >
              <Pencil size={17} aria-hidden />
            </button>
            <button
              className="grid h-9 w-9 place-items-center rounded-[8px] border border-red-100 text-[var(--danger)] transition hover:bg-red-50"
              type="button"
              onClick={() => onDelete(profile)}
              aria-label={`${birthYearLabel} 매물 삭제`}
            >
              <Trash2 size={17} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {lightboxIndex !== null ? (
        <PhotoLightbox
          photos={profile.photos}
          initialIndex={lightboxIndex}
          currentIndex={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </article>
  );
}

'use client';

/* eslint-disable @next/next/no-img-element */

import {ChevronLeft, ChevronRight, Pencil, Trash2} from 'lucide-react';
import {useState} from 'react';

import {formatBirthYearLabel} from '@/lib/profiles/age';
import {getProfileInformationRows} from '@/lib/profiles/information';
import type {Profile} from '@/types/profile';

type ProfileCardProps = {
  profile: Profile;
  isSelected: boolean;
  onSelectChange: (profileId: string, selected: boolean) => void;
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
  onStatusChange: (profileId: string, status: Profile['status']) => void;
};

export function ProfileCard({
  profile,
  isSelected,
  onSelectChange,
  onEdit,
  onDelete,
  onStatusChange,
}: ProfileCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
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

        <div className="absolute left-3 top-3 z-20 rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-[var(--violet-800)] shadow-sm">
          {profile.authorName}
        </div>

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
            profile.photos.map((p, i) => (
              <img
                key={p.id}
                className="absolute inset-0 h-full w-full select-none object-cover"
                src={p.url}
                alt={p.alt}
                draggable={false}
                style={{opacity: i === photoIndex ? 1 : 0}}
              />
            ))
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-500">사진 없음</div>
          )}

          {hasMultiplePhotos ? (
            <>
              <button
                className="absolute left-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[var(--violet-900)]"
                type="button"
                onClick={() => movePhoto(-1)}
                aria-label="이전 사진"
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <button
                className="absolute right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[var(--violet-900)]"
                type="button"
                onClick={() => movePhoto(1)}
                aria-label="다음 사진"
              >
                <ChevronRight size={18} aria-hidden />
              </button>
              <div className="absolute bottom-3 right-3 z-10 rounded-full bg-black/55 px-2 py-1 text-xs font-bold text-white">
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
    </article>
  );
}

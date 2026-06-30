'use client';

/* eslint-disable @next/next/no-img-element */

import {ChevronLeft, ChevronRight, Pencil, Trash2} from 'lucide-react';
import {useState} from 'react';

import {drinkingLabels, religionLabels, smokingLabels} from '@/lib/profiles/options';
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
  const photo = profile.photos[photoIndex] || profile.photos[0];
  const isBlocked = profile.status === 'blocked';
  const genderLabel = profile.gender === 'female' ? '여성' : '남성';
  const informationRows = [
    ['회사', profile.job],
    ['종교', religionLabels[profile.religion]],
    ['MBTI', profile.mbti || '미입력'],
    ['취미', profile.hobbies || '미입력'],
    ['흡연/음주', `${smokingLabels[profile.smoking]} / ${drinkingLabels[profile.drinking]}`],
    ['이상형', profile.idealType || '미입력'],
    ['코멘트', profile.matchmakerComment || '미입력'],
  ];

  const movePhoto = (direction: -1 | 1) => {
    const nextIndex = (photoIndex + direction + profile.photos.length) % profile.photos.length;
    setPhotoIndex(nextIndex);
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
          aria-label={`${genderLabel} ${profile.age}세 선택`}
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
          aria-label={`${genderLabel} ${profile.age}세 상태 변경`}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white shadow transition ${
              isBlocked ? 'translate-x-0' : 'translate-x-6'
            }`}
          />
        </button>

        <div className="relative aspect-[4/5] bg-[var(--violet-100)]">
          {photo ? (
            <img className="h-full w-full object-cover" src={photo.url} alt={photo.alt} />
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-500">사진 없음</div>
          )}

          {profile.photos.length > 1 ? (
            <>
              <button
                className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[var(--violet-900)]"
                type="button"
                onClick={() => movePhoto(-1)}
                aria-label="이전 사진"
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <button
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[var(--violet-900)]"
                type="button"
                onClick={() => movePhoto(1)}
                aria-label="다음 사진"
              >
                <ChevronRight size={18} aria-hidden />
              </button>
              <div className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2 py-1 text-xs font-bold text-white">
                {photoIndex + 1}/{profile.photos.length}
              </div>
            </>
          ) : null}
        </div>

        <div className="relative z-20 space-y-4 p-4">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--violet-950)]">
              {genderLabel} {profile.age}세
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {profile.height}cm · {profile.residence}
            </p>
          </div>

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
              aria-label={`${genderLabel} ${profile.age}세 수정`}
            >
              <Pencil size={17} aria-hidden />
            </button>
            <button
              className="grid h-9 w-9 place-items-center rounded-[8px] border border-red-100 text-[var(--danger)] transition hover:bg-red-50"
              type="button"
              onClick={() => onDelete(profile)}
              aria-label={`${genderLabel} ${profile.age}세 삭제`}
            >
              <Trash2 size={17} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

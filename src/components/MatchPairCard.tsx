'use client';

/* eslint-disable @next/next/no-img-element */

import {formatBirthYearLabel} from '@/lib/profiles/age';
import {PARTNER_THUMB_WIDTH, photoThumbnailUrl} from '@/lib/profiles/photo-url';
import type {Match} from '@/types/match';
import type {Profile} from '@/types/profile';

type Pair = {match: Match; female: Profile | undefined; male: Profile | undefined};

function MiniCard({profile, onOpen}: {profile: Profile | undefined; onOpen: (id: string) => void}) {
  if (!profile) {
    return <div className="grid flex-1 place-items-center rounded-[8px] border border-dashed border-slate-200 p-3 text-xs text-slate-400">(삭제된 매물)</div>;
  }
  const photo = profile.photos[0];
  return (
    <button
      type="button"
      className="flex flex-1 items-center gap-2 rounded-[8px] border border-[var(--border)] p-2 text-left transition hover:bg-[var(--violet-50)]"
      onClick={() => onOpen(profile.id)}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-[var(--violet-100)]">
        {photo ? <img className="h-full w-full object-cover" src={photoThumbnailUrl(photo.url, PARTNER_THUMB_WIDTH)} alt={photo.alt} draggable={false} /> : <span className="text-[9px] text-slate-400">없음</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[var(--violet-900)]">{formatBirthYearLabel(profile.birthYear)}</span>
        <span className="block truncate text-xs text-slate-500">{profile.residence} · {profile.job}</span>
      </span>
    </button>
  );
}

export function MatchPairCard({pair, onOpenProfile, onEndMatch, onDeleteMatch}: {
  pair: Pair;
  onOpenProfile: (id: string) => void;
  onEndMatch: (matchId: string) => void;
  onDeleteMatch: (matchId: string) => void;
}) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <MiniCard profile={pair.female} onOpen={onOpenProfile} />
        <span className="shrink-0 text-lg" aria-hidden>💞</span>
        <MiniCard profile={pair.male} onOpen={onOpenProfile} />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" className="rounded-[6px] border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={() => onEndMatch(pair.match.id)}>종료</button>
        <button type="button" className="rounded-[6px] border border-red-100 px-2.5 py-1 text-xs font-semibold text-[var(--danger)] hover:bg-red-50" onClick={() => onDeleteMatch(pair.match.id)}>삭제</button>
      </div>
    </div>
  );
}

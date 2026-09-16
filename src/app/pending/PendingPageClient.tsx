'use client';

/* eslint-disable @next/next/no-img-element */

import {useEffect, useState} from 'react';

import {AppHeader} from '@/components/AppHeader';
import {formatBirthYearLabel} from '@/lib/profiles/age';
import {genderLabels} from '@/lib/profiles/options';
import type {PendingProfile} from '@/types/pending';

export function PendingPageClient({authorName}: {authorName: string}) {
  const [items, setItems] = useState<PendingProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = () => {
    fetch('/api/pending')
      .then(r => r.json())
      .then(({pending}) => setItems(pending ?? []))
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  };
  useEffect(load, []);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/pending/${id}/approve`, {method: 'POST'});
      if (res.ok) setItems(cur => cur.filter(p => p.id !== id));
    } finally {
      setBusyId('');
    }
  };
  const reject = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/pending/${id}`, {method: 'DELETE'});
      if (res.ok) setItems(cur => cur.filter(p => p.id !== id));
    } finally {
      setBusyId('');
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <AppHeader page="pending" authorName={authorName} />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-5">
          <h1 className="text-3xl font-bold text-[var(--violet-950)]">대기 매물</h1>
          <p className="mt-1 text-sm text-slate-500">외부에서 제출된 매물을 승인하거나 거절합니다.</p>
        </header>

        {isLoading ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="rounded-[8px] border border-[var(--border)] bg-white p-8 text-center text-sm font-semibold text-slate-500">
            대기 중인 매물이 없습니다.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {items.map(p => (
              <li key={p.id} className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-white shadow-sm">
                <div className="flex gap-1 overflow-x-auto bg-[var(--violet-50)] p-2">
                  {p.photoUrls.length > 0 ? (
                    p.photoUrls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`대기 사진 ${i + 1}`}
                        className="h-28 w-24 shrink-0 rounded-[6px] object-cover"
                      />
                    ))
                  ) : (
                    <div className="grid h-28 w-full place-items-center text-xs text-slate-400">사진 없음</div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-bold text-[var(--violet-950)]">
                    {genderLabels[p.gender]} · {formatBirthYearLabel(p.birthYear)} · {p.height}cm
                  </p>
                  <p className="mt-1 break-keep text-sm text-slate-600">
                    {p.residence} · {p.job}
                  </p>
                  {p.extra ? <p className="mt-1 break-keep text-xs text-slate-400">{p.extra}</p> : null}
                  <p className="mt-2 text-[11px] text-slate-400">제출: {p.submittedBy}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="h-9 flex-1 rounded-[8px] bg-[var(--violet-600)] text-sm font-semibold text-white transition hover:bg-[var(--violet-700)] disabled:opacity-50"
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => approve(p.id)}
                    >
                      승인
                    </button>
                    <button
                      className="h-9 flex-1 rounded-[8px] border border-red-200 text-sm font-semibold text-[var(--danger)] transition hover:bg-red-50 disabled:opacity-50"
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => reject(p.id)}
                    >
                      거절
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

'use client';

import {ArrowLeft, ShieldCheck} from 'lucide-react';
import Link from 'next/link';
import {useEffect, useState} from 'react';

import {historyEventLabels} from '@/lib/history/events';
import type {HistoryEvent} from '@/types/history';

export default function HistoryPage() {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(({events: loaded}) => setEvents(loaded ?? []))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--violet-800)]" href="/">
                <ArrowLeft size={16} aria-hidden />
                대시보드
              </Link>
              <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--violet-800)]" href="/admin">
                <ShieldCheck size={16} aria-hidden />
                관리자
              </Link>
            </div>
            <h1 className="mt-2 text-3xl font-black text-[var(--violet-950)]">히스토리</h1>
            <p className="mt-1 text-sm text-slate-500">서비스 내 주요 변경 이벤트를 시간순으로 확인합니다.</p>
          </div>
          <div className="rounded-full bg-[var(--violet-50)] px-3 py-1.5 text-sm font-bold text-[var(--violet-900)]">
            {isLoading ? '...' : `${events.length}건`}
          </div>
        </header>

        <section className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-white shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-400">불러오는 중...</div>
          ) : events.length > 0 ? (
            <ol className="divide-y divide-[var(--border)]">
              {events.map(event => (
                <li className="grid gap-2 p-4 sm:grid-cols-[136px_1fr_156px] sm:items-center" key={event.id}>
                  <span className="w-fit rounded-full border border-[var(--violet-200)] bg-[var(--violet-50)] px-3 py-1 text-xs font-extrabold text-[var(--violet-900)]">
                    {historyEventLabels[event.type]}
                  </span>
                  <div className="min-w-0">
                    <p className="font-extrabold text-[var(--violet-950)]">{event.targetLabel}</p>
                    <p className="mt-1 break-keep text-sm leading-6 text-slate-600">
                      {event.description} · {event.actorName}
                    </p>
                  </div>
                  <time className="text-sm font-semibold text-slate-500" dateTime={event.createdAt}>
                    {new Date(event.createdAt).toLocaleString('ko-KR')}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">기록된 히스토리가 없습니다.</div>
          )}
        </section>
      </div>
    </main>
  );
}

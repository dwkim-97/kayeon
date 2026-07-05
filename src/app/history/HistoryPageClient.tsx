'use client';

import {useCallback, useEffect, useRef, useState} from 'react';

import {AppHeader} from '@/components/AppHeader';
import {historyEventLabels} from '@/lib/history/events';
import type {HistoryEvent} from '@/types/history';

export function HistoryPageClient({authorName}: {authorName: string}) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // 진행 중인 로드가 겹치지 않도록 하는 가드(상태 리렌더 없이 즉시 반영)
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/history?offset=${events.length}`);
      const {events: page, hasMore: more} = (await res.json()) as {
        events: HistoryEvent[];
        hasMore: boolean;
      };
      setEvents(current => [...current, ...(page ?? [])]);
      setHasMore(Boolean(more));
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
      setIsLoading(false);
    }
  }, [events.length, hasMore]);

  // 최초 1회 로드
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 센티넬이 화면에 들어오면 다음 페이지 로드
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      {rootMargin: '200px'},
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <AppHeader page="history" authorName={authorName} />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--violet-950)]">히스토리</h1>
            <p className="mt-1 text-sm text-slate-500">서비스 내 주요 변경 이벤트를 시간순으로 확인합니다.</p>
          </div>
          <div className="rounded-full bg-[var(--violet-50)] px-3 py-1.5 text-sm font-semibold text-[var(--violet-900)]">
            {isLoading ? '...' : `${events.length}건${hasMore ? '+' : ''}`}
          </div>
        </header>

        <section className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-white shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-400">불러오는 중...</div>
          ) : events.length > 0 ? (
            <>
              <ol className="divide-y divide-[var(--border)]">
                {events.map(event => (
                  <li className="grid gap-2 p-4 sm:grid-cols-[136px_1fr_156px] sm:items-center" key={event.id}>
                    <span className="w-fit rounded-full border border-[var(--border)] bg-[var(--violet-50)] px-3 py-1 text-xs font-semibold text-[var(--violet-900)]">
                      {historyEventLabels[event.type]}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--violet-950)]">{event.targetLabel}</p>
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
              {hasMore ? (
                <div ref={sentinelRef} className="p-4 text-center text-sm font-semibold text-slate-400">
                  {isLoadingMore ? '더 불러오는 중...' : ''}
                </div>
              ) : (
                <div className="p-4 text-center text-xs font-semibold text-slate-300">모든 기록을 불러왔습니다.</div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">기록된 히스토리가 없습니다.</div>
          )}
        </section>
      </div>
    </main>
  );
}

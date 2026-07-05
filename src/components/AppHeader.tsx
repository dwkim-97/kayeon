'use client';

import {ClipboardList, History, LogOut, Menu, ShieldCheck, UserCircle2, Users, X} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

import {useBodyScrollLock} from '@/hooks/useBodyScrollLock';
import {logout} from '@/lib/auth/logout';

type NavPage = 'dashboard' | 'admin' | 'history' | 'pending';

const pendingLink = {
  href: '/pending',
  label: '대기 매물',
  icon: <ClipboardList size={14} strokeWidth={1.75} aria-hidden />,
};

const NAV_LINKS: Record<NavPage, {href: string; label: string; icon: React.ReactNode}[]> = {
  dashboard: [
    pendingLink,
    {href: '/history', label: '히스토리', icon: <History size={14} strokeWidth={1.75} aria-hidden />},
    {href: '/admin', label: '관리자', icon: <ShieldCheck size={14} strokeWidth={1.75} aria-hidden />},
  ],
  admin: [
    {href: '/', label: '대시보드', icon: <Users size={14} strokeWidth={1.75} aria-hidden />},
    pendingLink,
    {href: '/history', label: '히스토리', icon: <History size={14} strokeWidth={1.75} aria-hidden />},
  ],
  history: [
    {href: '/', label: '대시보드', icon: <Users size={14} strokeWidth={1.75} aria-hidden />},
    pendingLink,
    {href: '/admin', label: '관리자', icon: <ShieldCheck size={14} strokeWidth={1.75} aria-hidden />},
  ],
  pending: [
    {href: '/', label: '대시보드', icon: <Users size={14} strokeWidth={1.75} aria-hidden />},
    {href: '/history', label: '히스토리', icon: <History size={14} strokeWidth={1.75} aria-hidden />},
    {href: '/admin', label: '관리자', icon: <ShieldCheck size={14} strokeWidth={1.75} aria-hidden />},
  ],
};

const linkClass =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--violet-900)]';
const logoutClass =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-white px-3 text-xs font-semibold text-slate-600';

export function AppHeader({
  page,
  sticky = true,
  authorName = '',
}: {
  page: NavPage;
  sticky?: boolean;
  authorName?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const links = NAV_LINKS[page];
  const accountLabel = authorName.trim();

  useBodyScrollLock(menuOpen);

  useEffect(() => {
    // SSR-safe portal gate: server and first client render agree (no portal),
    // then we flip on mount so createPortal(document.body) only runs client-side.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={`border-b border-[var(--border)] bg-white ${
        sticky ? 'sticky top-0 z-40' : ''
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2">
        <Image src="/logo.png" alt="카연" width={84} height={28} priority />

        {/* Desktop / tablet inline nav (sm and up) */}
        <div className="hidden items-center gap-2.5 sm:flex">
          {links.map(link => (
            <Link key={link.href} className={`${linkClass} flex-none`} href={link.href}>
              {link.icon}
              {link.label}
            </Link>
          ))}
          {accountLabel ? (
            <span
              className="inline-flex h-9 flex-none items-center gap-1.5 rounded-[8px] bg-[var(--violet-50)] px-3 text-xs font-semibold text-[var(--violet-900)]"
              title={`접속 계정: ${accountLabel}`}
            >
              <UserCircle2 size={14} strokeWidth={1.75} aria-hidden />
              {accountLabel}
            </span>
          ) : null}
          <button className={`${logoutClass} flex-none`} type="button" onClick={logout}>
            <LogOut size={14} strokeWidth={1.75} aria-hidden />
            로그아웃
          </button>
        </div>

        {/* Mobile hamburger (below sm) */}
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--border)] bg-white text-[var(--violet-900)] sm:hidden"
          type="button"
          aria-label="메뉴 열기"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={18} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {/* Mobile drawer — portaled to <body> so a transformed/backdrop-filtered
          ancestor (e.g. the dashboard's sticky blur wrapper) can't turn into the
          containing block for these `fixed` layers and clip them. */}
      {mounted &&
        createPortal(
          <div className={`sm:hidden ${menuOpen ? '' : 'pointer-events-none'}`}>
            <div
              className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ${
                menuOpen ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden
              onClick={() => setMenuOpen(false)}
            />
            <aside
              className={`fixed inset-y-0 right-0 z-50 flex w-64 max-w-[80vw] flex-col gap-2.5 border-l border-[var(--border)] bg-white p-4 shadow-xl transition-transform duration-200 ${
                menuOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
              role="dialog"
              aria-modal="true"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--violet-900)]">메뉴</span>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border)] bg-white text-slate-600"
                  type="button"
                  aria-label="메뉴 닫기"
                  onClick={() => setMenuOpen(false)}
                >
                  <X size={18} strokeWidth={1.75} aria-hidden />
                </button>
              </div>
              {accountLabel ? (
                <div className="mb-1 flex items-center gap-2 rounded-[8px] bg-[var(--violet-50)] px-3 py-2.5">
                  <UserCircle2 size={18} strokeWidth={1.75} className="text-[var(--violet-700)]" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--violet-400)]">
                      접속 계정
                    </span>
                    <span className="block truncate text-sm font-bold text-[var(--violet-900)]">{accountLabel}</span>
                  </span>
                </div>
              ) : null}
              {links.map(link => (
                <Link
                  key={link.href}
                  className={`${linkClass} w-full justify-start`}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
              <button
                className={`${logoutClass} w-full justify-start`}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                <LogOut size={14} strokeWidth={1.75} aria-hidden />
                로그아웃
              </button>
            </aside>
          </div>,
          document.body,
        )}
    </header>
  );
}

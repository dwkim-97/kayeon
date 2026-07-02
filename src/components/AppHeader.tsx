'use client';

import {History, LogOut, ShieldCheck, Users} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import {logout} from '@/lib/auth/logout';

type NavPage = 'dashboard' | 'admin' | 'history';

const NAV_LINKS: Record<NavPage, {href: string; label: string; icon: React.ReactNode}[]> = {
  dashboard: [
    {href: '/history', label: '히스토리', icon: <History size={14} strokeWidth={1.75} aria-hidden />},
    {href: '/admin', label: '관리자', icon: <ShieldCheck size={14} strokeWidth={1.75} aria-hidden />},
  ],
  admin: [
    {href: '/', label: '대시보드', icon: <Users size={14} strokeWidth={1.75} aria-hidden />},
    {href: '/history', label: '히스토리', icon: <History size={14} strokeWidth={1.75} aria-hidden />},
  ],
  history: [
    {href: '/', label: '대시보드', icon: <Users size={14} strokeWidth={1.75} aria-hidden />},
    {href: '/admin', label: '관리자', icon: <ShieldCheck size={14} strokeWidth={1.75} aria-hidden />},
  ],
};

export function AppHeader({page, sticky = true}: {page: NavPage; sticky?: boolean}) {
  return (
    <header
      className={`border-b border-[var(--border)] bg-white/92 backdrop-blur ${
        sticky ? 'sticky top-0 z-40' : ''
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <Image src="/logo.png" alt="카연" width={84} height={28} priority />
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {NAV_LINKS[page].map(link => (
            <Link
              key={link.href}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-white px-2.5 text-xs font-semibold text-[var(--violet-900)] sm:flex-none"
              href={link.href}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
          <button
            className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-[var(--border)] bg-white px-2.5 text-xs font-semibold text-slate-600 sm:flex-none"
            type="button"
            onClick={logout}
          >
            <LogOut size={14} strokeWidth={1.75} aria-hidden />
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}

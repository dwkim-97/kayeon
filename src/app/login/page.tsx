'use client';

import Image from 'next/image';
import {useRouter, useSearchParams} from 'next/navigation';
import {FormEvent, Suspense, useState} from 'react';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <LoginShell>
          <div className="h-12 rounded-[8px] bg-[var(--violet-100)]" />
        </LoginShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const body = new FormData();
    body.set('loginId', loginId);
    body.set('password', password);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body,
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setError('아이디 또는 비밀번호를 확인해 주세요.');
      return;
    }

    router.replace(nextPath);
    router.refresh();
  };

  return (
    <LoginShell>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">아이디</span>
          <input
            className="h-12 w-full rounded-[8px] border border-[var(--border)] px-4 text-base outline-none transition focus:border-[var(--violet-500)] focus:ring-4 focus:ring-[var(--violet-100)]"
            type="text"
            value={loginId}
            onChange={event => setLoginId(event.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">비밀번호</span>
          <input
            className="h-12 w-full rounded-[8px] border border-[var(--border)] px-4 text-base outline-none transition focus:border-[var(--violet-500)] focus:ring-4 focus:ring-[var(--violet-100)]"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}

        <button
          className="h-12 w-full rounded-[8px] bg-[var(--violet-600)] px-4 font-bold text-white shadow-[0_12px_28px_rgba(127,34,254,0.24)] transition hover:bg-[var(--violet-700)] disabled:bg-[var(--violet-300)]"
          type="submit"
          disabled={isSubmitting || loginId.trim().length === 0 || password.length === 0}
        >
          {isSubmitting ? '확인 중' : '로그인'}
        </button>
      </form>
    </LoginShell>
  );
}

function LoginShell({children}: {children: React.ReactNode}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--violet-50)] px-5 py-10">
      <section className="w-full max-w-[420px] rounded-[8px] border border-[var(--border)] bg-white p-8 shadow-[0_24px_80px_rgba(47,13,104,0.12)]">
        <div className="mb-8">
          <Image src="/logo.png" alt="카연" width={140} height={48} className="mb-3" priority />
          <p className="text-sm text-slate-500">관리자가 등록한 사용자만 접근할 수 있습니다.</p>
        </div>
        {children}
      </section>
    </main>
  );
}

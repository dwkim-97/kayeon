'use client';

import {Plus, Trash2, X} from 'lucide-react';
import Link from 'next/link';
import {FormEvent, useEffect, useState} from 'react';

import {AppHeader} from '@/components/AppHeader';
import {closedAlertState, CustomAlert, type CustomAlertState} from '@/components/CustomAlert';
import {recordHistory} from '@/lib/history/events';
import type {ManagedUser} from '@/types/user';

type UserFormValues = {
  name: string;
  loginId: string;
  password: string;
  phoneNumber: string;
};

type UserCreateResult = {
  success: boolean;
  message: string;
};

type AdminPageClientProps = {
  authorName: string;
};

export function AdminPageClient({authorName}: AdminPageClientProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertState, setAlertState] = useState<CustomAlertState>(closedAlertState);

  useEffect(() => {
    let ignore = false;

    async function loadUsers() {
      try {
        const response = await fetch('/api/admin/users');
        const data = (await response.json()) as {users: ManagedUser[]};

        if (!ignore) {
          setUsers(data.users);
        }
      } catch {
        if (!ignore) {
          setAlertState({
            kind: 'alert',
            title: '관리자 목록을 불러오지 못했습니다.',
            message: '잠시 후 다시 시도해 주세요.',
          });
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      ignore = true;
    };
  }, []);

  const createUser = async (values: UserFormValues): Promise<UserCreateResult> => {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...values, recommenderName: authorName}),
    });
    const data = (await response.json()) as {user: ManagedUser; message: string};

    if (!response.ok) {
      return {
        success: false,
        message: data.message,
      };
    }

    setUsers(current => [data.user, ...current]);
    recordHistory({
      type: 'admin_created',
      actorName: authorName,
      targetLabel: data.user.loginId,
      description: `${data.user.loginId} 관리자 계정을 추가했습니다.`,
    });

    return {
      success: true,
      message: '',
    };
  };

  const removeUser = async (user: ManagedUser) => {
    const response = await fetch(`/api/admin/users/${user.id}`, {method: 'DELETE'});
    const data = (await response.json()) as {user: ManagedUser; message: string};

    if (!response.ok) {
      setAlertState({
        kind: 'alert',
        title: '관리자를 제거하지 못했습니다.',
        message: data.message,
      });
      return;
    }

    setUsers(current => current.filter(currentUser => currentUser.id !== user.id));
    recordHistory({
      type: 'admin_removed',
      actorName: authorName,
      targetLabel: data.user.loginId,
      description: `${data.user.loginId} 관리자 계정을 제거했습니다.`,
    });
  };

  const requestRemove = (user: ManagedUser) => {
    setAlertState({
      kind: 'confirm',
      title: '관리자를 제거하시겠습니까?',
      message: `${user.loginId} 계정은 더 이상 서비스에 로그인할 수 없습니다.`,
      confirmLabel: '예',
      confirmVariant: 'danger',
      onConfirm: () => {
        void removeUser(user);
      },
    });
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <AppHeader page="admin" />

      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--violet-950)]">관리자 페이지</h1>
            <p className="mt-1 text-sm text-slate-500">모든 유저는 관리자 권한으로 소개 풀을 관리합니다.</p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[var(--violet-600)] px-4 font-semibold text-white hover:bg-[var(--violet-700)]"
            type="button"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} strokeWidth={1.75} aria-hidden />
            관리자 추가
          </button>
        </header>

        <section className="hidden overflow-hidden rounded-[8px] border border-[var(--border)] bg-white shadow-sm md:block">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead className="bg-[var(--violet-50)] text-sm text-[var(--violet-900)]">
              <tr>
                <th className="px-4 py-3">아이디</th>
                <th className="px-4 py-3">추천인</th>
                <th className="px-4 py-3">전화번호</th>
                <th className="px-4 py-3">등록일</th>
                <th className="px-4 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-sm">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-semibold text-[var(--violet-950)]">{user.loginId}</td>
                  <td className="px-4 py-3 text-slate-600">{user.recommenderName}</td>
                  <td className="px-4 py-3 text-slate-600">{user.phoneNumber}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="inline-grid h-9 w-9 place-items-center rounded-[8px] border border-red-100 text-[var(--danger)] hover:bg-red-50"
                      type="button"
                      onClick={() => requestRemove(user)}
                      aria-label={`${user.loginId} 관리자 제거`}
                    >
                      <Trash2 size={17} strokeWidth={1.75} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid gap-3 md:hidden">
          {users.map(user => (
            <article className="rounded-[8px] border border-[var(--border)] bg-white p-4 shadow-sm" key={user.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--violet-950)]">{user.loginId}</h2>
                </div>
                <button
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-red-100 text-[var(--danger)] hover:bg-red-50"
                  type="button"
                  onClick={() => requestRemove(user)}
                  aria-label={`${user.loginId} 관리자 제거`}
                >
                  <Trash2 size={17} strokeWidth={1.75} aria-hidden />
                </button>
              </div>
              <dl className="mt-3 grid grid-cols-[76px_1fr] gap-y-2 text-sm">
                <dt className="font-semibold text-[var(--violet-900)]">추천인</dt>
                <dd className="text-slate-600">{user.recommenderName}</dd>
                <dt className="font-semibold text-[var(--violet-900)]">전화번호</dt>
                <dd className="text-slate-600">{user.phoneNumber}</dd>
                <dt className="font-semibold text-[var(--violet-900)]">등록일</dt>
                <dd className="text-slate-500">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</dd>
              </dl>
            </article>
          ))}
        </section>

        {!isLoading && users.length === 0 ? (
          <div className="rounded-[8px] border border-[var(--border)] bg-white p-6 text-center text-sm font-semibold text-slate-500">
            등록된 관리자가 없습니다.
          </div>
        ) : null}
      </div>

      {isModalOpen ? (
        <UserCreateModal
          authorName={authorName}
          onClose={() => setIsModalOpen(false)}
          onCreate={async values => {
            const result = await createUser(values);

            if (result.success) {
              setIsModalOpen(false);
            }

            return result;
          }}
        />
      ) : null}
      <CustomAlert state={alertState} onClose={() => setAlertState(closedAlertState)} />
    </main>
  );
}

function UserCreateModal({
  authorName,
  onClose,
  onCreate,
}: {
  authorName: string;
  onClose: () => void;
  onCreate: (values: UserFormValues) => Promise<UserCreateResult>;
}) {
  const [values, setValues] = useState<UserFormValues>({
    name: '',
    loginId: '',
    password: '',
    phoneNumber: '',
  });
  const [alertState, setAlertState] = useState<CustomAlertState>(closedAlertState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showError = (message: string) =>
    setAlertState({kind: 'alert', title: '입력 오류', message});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!values.name.trim()) { showError('이름을 입력해 주세요.'); return; }
    if (!values.loginId.trim()) { showError('아이디를 입력해 주세요.'); return; }
    if (!values.password.trim()) { showError('비밀번호를 입력해 주세요.'); return; }
    if (values.password.trim().length < 8) { showError('비밀번호는 8자 이상으로 입력해 주세요.'); return; }
    if (!values.phoneNumber.trim()) { showError('전화번호를 입력해 주세요.'); return; }
    if (!/^\d{3}-\d{3,4}-\d{4}$/.test(values.phoneNumber.trim())) {
      showError('전화번호는 000-0000-0000 형식으로 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    const result = await onCreate(values);
    setIsSubmitting(false);

    if (!result.success) {
      showError(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--violet-950)]/45 p-3 sm:p-4">
      <section className="max-h-[94vh] w-full max-w-md overflow-hidden rounded-[8px] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-xl font-semibold text-[var(--violet-950)]">관리자 추가</h2>
          <button
            className="grid h-9 w-9 place-items-center rounded-[8px] text-slate-500 hover:bg-[var(--violet-50)]"
            type="button"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={20} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <form className="max-h-[calc(94vh-74px)] space-y-4 overflow-y-auto p-5" onSubmit={handleSubmit}>
          <p className="rounded-[8px] bg-[var(--violet-50)] p-3 text-sm font-semibold text-[var(--violet-900)]">
            서비스 안전을 위해 항상 확실한 분들만 추가 부탁드립니다.
          </p>
          <AdminTextField
            label="이름"
            required={true}
            type="text"
            placeholder="홍길동"
            value={values.name}
            disabled={false}
            onChange={value => setValues(current => ({...current, name: value}))}
          />
          <AdminTextField
            label="아이디"
            required={true}
            type="text"
            placeholder="kayeon01"
            value={values.loginId}
            disabled={false}
            onChange={value => setValues(current => ({...current, loginId: value}))}
          />
          <AdminTextField
            label="비밀번호"
            required={true}
            type="password"
            placeholder="8자 이상"
            value={values.password}
            disabled={false}
            onChange={value => setValues(current => ({...current, password: value}))}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">추천인</span>
            <p className="flex h-10 items-center rounded-[8px] border border-[var(--border)] bg-slate-50 px-3 text-sm text-slate-500">{authorName}</p>
          </label>
          <AdminTextField
            label="전화번호"
            required={true}
            type="text"
            placeholder="010-0000-0000"
            value={values.phoneNumber}
            disabled={false}
            onChange={value => setValues(current => ({...current, phoneNumber: value}))}
          />
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button className="h-10 rounded-[8px] border border-[var(--border)] px-4 font-semibold text-slate-600" type="button" onClick={onClose}>
              취소
            </button>
            <button
              className="h-10 rounded-[8px] bg-[var(--violet-600)] px-4 font-semibold text-white disabled:bg-[var(--violet-300)]"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '추가 중' : '추가'}
            </button>
          </div>
        </form>
      </section>
      <CustomAlert state={alertState} onClose={() => setAlertState(closedAlertState)} />
    </div>
  );
}

function AdminTextField({
  label,
  required,
  type,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string;
  required: boolean;
  type: 'text' | 'password';
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="ml-1 text-[var(--danger)]">*</span> : null}
      </span>
      <input
        className="h-10 w-full rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)] disabled:bg-slate-50 disabled:text-slate-500"
        type={type}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

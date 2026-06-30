'use client';

import {History, LogOut, Plus, ShieldCheck, Users} from 'lucide-react';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';

import {closedAlertState, CustomAlert, type CustomAlertState} from '@/components/CustomAlert';
import {FilterBar} from '@/components/FilterBar';
import {ProfileCard} from '@/components/ProfileCard';
import {ProfileFormModal} from '@/components/ProfileFormModal';
import {ShareButton} from '@/components/ShareButton';
import {filterProfiles} from '@/lib/profiles/filter';
import {recordHistoryEvent} from '@/lib/storage/history';
import {loadProfiles, saveProfiles} from '@/lib/storage/profiles';
import type {Gender, Profile, ProfileFilters} from '@/types/profile';

type ModalState =
  | {
      kind: 'closed';
    }
  | {
      kind: 'create';
    }
  | {
      kind: 'edit';
      profile: Profile;
    };

const defaultFilters = (gender: Gender): ProfileFilters => ({
  gender,
  minAge: 19,
  maxAge: 80,
  minHeight: 120,
  maxHeight: 230,
  religions: [],
  smoking: [],
  query: '',
});

export function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[]>(() => loadProfiles());
  const [filters, setFilters] = useState<ProfileFilters>(defaultFilters('female'));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({kind: 'closed'});
  const [alertState, setAlertState] = useState<CustomAlertState>(closedAlertState);

  useEffect(() => {
    saveProfiles(profiles);
  }, [profiles]);

  const visibleProfiles = useMemo(() => filterProfiles(profiles, filters), [profiles, filters]);
  const activeVisibleProfiles = useMemo(
    () => visibleProfiles.filter(profile => profile.status === 'active'),
    [visibleProfiles],
  );
  const selectedProfiles = useMemo(
    () => profiles.filter(profile => selectedIds.includes(profile.id) && profile.status === 'active'),
    [profiles, selectedIds],
  );
  const allVisibleSelected =
    activeVisibleProfiles.length > 0 && activeVisibleProfiles.every(profile => selectedIds.includes(profile.id));

  const switchGender = (gender: Gender) => {
    setFilters(current => ({...defaultFilters(gender), query: current.query}));
    setSelectedIds([]);
  };

  const updateProfiles = (nextProfiles: Profile[]) => {
    setProfiles(nextProfiles);
  };

  const handleSelectChange = (profileId: string, selected: boolean) => {
    const targetProfile = profiles.find(profile => profile.id === profileId);

    if (!targetProfile || targetProfile.status === 'blocked') {
      return;
    }

    setSelectedIds(current => (selected ? [...new Set([...current, profileId])] : current.filter(id => id !== profileId)));
  };

  const handleSelectAll = (selected: boolean) => {
    const visibleIds = activeVisibleProfiles.map(profile => profile.id);
    setSelectedIds(current => (selected ? [...new Set([...current, ...visibleIds])] : current.filter(id => !visibleIds.includes(id))));
  };

  const writeHistory = (profile: Profile, type: 'profile_created' | 'profile_updated' | 'profile_deleted' | 'profile_blocked' | 'profile_activated') => {
    const descriptionByType: Record<typeof type, string> = {
      profile_created: '인물 정보를 추가했습니다.',
      profile_updated: '인물 정보를 수정했습니다.',
      profile_deleted: '인물 정보를 삭제했습니다.',
      profile_blocked: '인물 정보를 blocked 상태로 변경했습니다.',
      profile_activated: '인물 정보를 active 상태로 변경했습니다.',
    };

    recordHistoryEvent({
      id: crypto.randomUUID(),
      type,
      actorName: 'Aiden',
      targetLabel: getProfileLabel(profile),
      description: descriptionByType[type],
      createdAt: new Date().toISOString(),
    });
  };

  const requestDelete = (profile: Profile) => {
    setAlertState({
      kind: 'confirm',
      title: '정말 삭제하시겠습니까?',
      message: `${getProfileLabel(profile)} 정보를 삭제합니다. 삭제 후에는 대시보드에서 복구할 수 없습니다.`,
      confirmLabel: '예',
      confirmVariant: 'danger',
      onConfirm: () => {
        updateProfiles(profiles.filter(currentProfile => currentProfile.id !== profile.id));
        setSelectedIds(current => current.filter(id => id !== profile.id));
        writeHistory(profile, 'profile_deleted');
      },
    });
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {method: 'POST'});
    window.location.href = '/login';
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--violet-600)]">Kayeon</p>
            <h1 className="mt-1 text-2xl font-black text-[var(--violet-950)]">소개 풀 대시보드</h1>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Link
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border border-[var(--violet-200)] bg-white px-3 text-sm font-bold text-[var(--violet-900)] sm:flex-none"
              href="/history"
            >
              <History size={16} aria-hidden />
              히스토리
            </Link>
            <Link
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border border-[var(--violet-200)] bg-[var(--violet-50)] px-3 text-sm font-bold text-[var(--violet-900)] sm:flex-none"
              href="/admin"
            >
              <ShieldCheck size={16} aria-hidden />
              관리자
            </Link>
            <button
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] border border-[var(--border)] bg-white px-3 text-sm font-bold text-slate-600 sm:flex-none"
              type="button"
              onClick={handleLogout}
            >
              <LogOut size={16} aria-hidden />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="inline-flex w-full rounded-[8px] border border-[var(--violet-200)] bg-white p-1 sm:w-auto">
            {(['female', 'male'] as Gender[]).map(gender => (
              <button
                className={`h-10 flex-1 rounded-[7px] px-5 text-sm font-extrabold sm:flex-none ${
                  filters.gender === gender ? 'bg-[var(--violet-600)] text-white' : 'text-[var(--violet-900)]'
                }`}
                key={gender}
                type="button"
                onClick={() => switchGender(gender)}
              >
                {gender === 'female' ? '여성' : '남성'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <ShareButton profiles={selectedProfiles} />
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[var(--violet-950)] px-4 font-bold text-white transition hover:bg-[var(--violet-900)]"
              type="button"
              onClick={() => setModal({kind: 'create'})}
            >
              <Plus size={18} aria-hidden />
              인물 추가
            </button>
          </div>
        </section>

        <FilterBar filters={filters} onChange={setFilters} />

        <section className="mt-5 rounded-[8px] border border-[var(--border)] bg-white p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                className="h-4 w-4 accent-[var(--violet-600)]"
                type="checkbox"
                checked={allVisibleSelected}
                disabled={activeVisibleProfiles.length === 0}
                onChange={event => handleSelectAll(event.target.checked)}
              />
              현재 grid active 전체 선택
            </label>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--violet-50)] px-3 py-1.5 text-sm font-bold text-[var(--violet-900)]">
              <Users size={16} aria-hidden />
              {visibleProfiles.length}명 표시 · {selectedProfiles.length}명 공유 선택
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5">
            {visibleProfiles.map(profile => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                isSelected={selectedIds.includes(profile.id)}
                onSelectChange={handleSelectChange}
                onEdit={selectedProfile => setModal({kind: 'edit', profile: selectedProfile})}
                onDelete={requestDelete}
                onStatusChange={(profileId, status) => {
                  const targetProfile = profiles.find(profile => profile.id === profileId);

                  if (!targetProfile) {
                    return;
                  }

                  const updatedProfile = {...targetProfile, status, updatedAt: new Date().toISOString()};
                  updateProfiles(profiles.map(profile => (profile.id === profileId ? updatedProfile : profile)));

                  if (status === 'blocked') {
                    setSelectedIds(current => current.filter(id => id !== profileId));
                    writeHistory(updatedProfile, 'profile_blocked');
                    return;
                  }

                  writeHistory(updatedProfile, 'profile_activated');
                }}
              />
            ))}
          </div>
        </section>
      </div>

      {modal.kind !== 'closed' ? (
        <ProfileFormModal
          key={modal.kind === 'edit' ? modal.profile.id : 'create'}
          mode={modal}
          authorName="Aiden"
          onClose={() => setModal({kind: 'closed'})}
          onCreate={profile => {
            updateProfiles([profile, ...profiles]);
            writeHistory(profile, 'profile_created');
            setModal({kind: 'closed'});
          }}
          onUpdate={updatedProfile => {
            updateProfiles(profiles.map(profile => (profile.id === updatedProfile.id ? updatedProfile : profile)));
            writeHistory(updatedProfile, 'profile_updated');
            setModal({kind: 'closed'});
          }}
        />
      ) : null}
      <CustomAlert state={alertState} onClose={() => setAlertState(closedAlertState)} />
    </main>
  );
}

function getProfileLabel(profile: Profile) {
  const genderLabel = profile.gender === 'female' ? '여성' : '남성';
  return `${genderLabel} ${profile.age}세 · ${profile.residence}`;
}

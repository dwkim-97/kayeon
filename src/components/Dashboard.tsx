'use client';

import {Plus, Users} from 'lucide-react';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';

import {AppHeader} from '@/components/AppHeader';
import {closedAlertState, CustomAlert, type CustomAlertState} from '@/components/CustomAlert';
import {FilterBar} from '@/components/FilterBar';
import {ProfileCard} from '@/components/ProfileCard';
import {ProfileFormModal} from '@/components/ProfileFormModal';
import {ShareButton} from '@/components/ShareButton';
import {historyEventDescriptions, recordHistory} from '@/lib/history/events';
import {formatBirthYearLabel} from '@/lib/profiles/age';
import {filterProfiles} from '@/lib/profiles/filter';
import {genderLabels} from '@/lib/profiles/options';
import type {Gender, Profile, ProfileFilters, ProfileStatus} from '@/types/profile';
import type {ProfileEventType} from '@/types/history';

type ModalState =
  | {kind: 'closed'}
  | {kind: 'create'}
  | {kind: 'edit'; profile: Profile};

const defaultFilters = (gender: Gender): ProfileFilters => ({
  gender,
  birthYearValue: '',
  birthYearComparison: 'gte',
  heightValue: '',
  heightComparison: 'gte',
  activeOnly: true,
  religion: '',
  smoking: '',
  query: '',
});

type UploadedPhotoId = {tempId: string; id: string; url: string};

async function apiUploadPhotos(profileId: string, photos: Profile['photos']): Promise<UploadedPhotoId[]> {
  const newPhotos = photos.filter(p => p.url.startsWith('data:'));
  const retainedPhotos = photos
    .filter(p => !p.url.startsWith('data:'))
    .map(p => ({id: p.id, order: p.order}));

  let uploadedPhotoIds: UploadedPhotoId[] = [];

  if (newPhotos.length > 0) {
    // Step 1: get presigned upload URLs from server
    const signRes = await fetch(`/api/profiles/${profileId}/photos`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        photos: newPhotos.map(p => {
          const mimeMatch = p.url.match(/^data:([^;]+);base64,/);
          return {tempId: p.id, mimeType: mimeMatch?.[1] ?? 'image/jpeg'};
        }),
      }),
    });
    const {signed} = (await signRes.json()) as {
      signed: {tempId: string; uploadUrl: string; storagePath: string; id: string}[];
    };

    // Step 2: upload each file directly to Supabase Storage
    await Promise.all(
      signed.map(async ({uploadUrl, tempId}) => {
        const photo = newPhotos.find(p => p.id === tempId)!;
        const base64 = photo.url.split(',')[1];
        const mimeMatch = photo.url.match(/^data:([^;]+);base64,/);
        const mimeType = mimeMatch?.[1] ?? 'image/jpeg';
        const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: {'Content-Type': mimeType},
          body: binary,
        });
      }),
    );

    // Step 3: register uploaded paths in DB
    const registerRes = await fetch(`/api/profiles/${profileId}/photos`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        newPhotos: signed.map(s => {
          const photo = newPhotos.find(p => p.id === s.tempId)!;
          return {tempId: s.tempId, id: s.id, storagePath: s.storagePath, alt: photo.alt, order: photo.order};
        }),
        retainedPhotos,
      }),
    });
    if (!registerRes.ok) {
      const body = await registerRes.text();
      throw new Error(`사진 저장 실패: ${body}`);
    }

    uploadedPhotoIds = signed.map(s => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      return {
        tempId: s.tempId,
        id: s.id,
        url: `${supabaseUrl}/storage/v1/object/public/profile-photos/${s.storagePath}`,
      };
    });
  } else {
    // No new photos — still send retainedPhotos to update sort_order
    const reorderRes = await fetch(`/api/profiles/${profileId}/photos`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({newPhotos: [], retainedPhotos}),
    });
    if (!reorderRes.ok) {
      const body = await reorderRes.text();
      throw new Error(`사진 순서 저장 실패: ${body}`);
    }
  }

  return uploadedPhotoIds;
}

function resolvePhotos(photos: Profile['photos'], uploadedPhotoIds: UploadedPhotoId[]): Profile['photos'] {
  const byTempId = new Map(uploadedPhotoIds.map(u => [u.tempId, u]));
  return photos.map(p => {
    const resolved = byTempId.get(p.id);
    return resolved ? {...p, id: resolved.id, url: resolved.url} : p;
  });
}

function getProfileLabel(profile: Profile) {
  return `${genderLabels[profile.gender]} ${formatBirthYearLabel(profile.birthYear)} · ${profile.residence}`;
}

type DashboardProps = {
  authorName: string;
};

export function Dashboard({authorName}: DashboardProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [filters, setFilters] = useState<ProfileFilters>(defaultFilters('female'));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({kind: 'closed'});
  const [alertState, setAlertState] = useState<CustomAlertState>(closedAlertState);

  useEffect(() => {
    fetch('/api/profiles')
      .then(res => res.json())
      .then(({profiles: loaded}) => setProfiles(loaded ?? []))
      .catch(() => setProfiles([]))
      .finally(() => setIsLoading(false));
  }, []);

  const visibleProfiles = useMemo(() => filterProfiles(profiles, filters), [profiles, filters]);
  const activeVisibleProfiles = useMemo(
    () => visibleProfiles.filter(profile => profile.isActivated),
    [visibleProfiles],
  );
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedProfiles = useMemo(
    () => profiles.filter(profile => selectedIdsSet.has(profile.id) && profile.isActivated),
    [profiles, selectedIdsSet],
  );
  const allVisibleSelected =
    activeVisibleProfiles.length > 0 && activeVisibleProfiles.every(profile => selectedIdsSet.has(profile.id));

  const switchGender = (gender: Gender) => {
    setFilters(current => ({...defaultFilters(gender), query: current.query}));
    setSelectedIds([]);
  };

  const resetFilters = () => {
    setFilters(defaultFilters(filters.gender));
    setSelectedIds([]);
  };

  const handleSelectChange = (profileId: string, selected: boolean) => {
    const target = profiles.find(p => p.id === profileId);
    if (!target?.isActivated) return;
    setSelectedIds(current => (selected ? [...new Set([...current, profileId])] : current.filter(id => id !== profileId)));
  };

  const handleSelectAll = (selected: boolean) => {
    const visibleIds = activeVisibleProfiles.map(p => p.id);
    setSelectedIds(current => (selected ? [...new Set([...current, ...visibleIds])] : current.filter(id => !visibleIds.includes(id))));
  };

  const writeHistory = (profile: Profile, type: ProfileEventType) => {
    recordHistory({
      type,
      actorName: authorName,
      targetLabel: getProfileLabel(profile),
      description: historyEventDescriptions[type],
    });
  };

  const handleCreate = async (newProfile: Profile) => {
    const {photos, ...rest} = newProfile;
    setIsMutating(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(rest),
      });

      if (!res.ok) {
        const message = await res.text();
        setAlertState({kind: 'alert', title: '저장 실패', message});
        return;
      }

      const {profile: created} = await res.json();
      const uploadedPhotoIds = await apiUploadPhotos(created.id, photos);
      setProfiles(current => [{...created, photos: resolvePhotos(photos, uploadedPhotoIds)}, ...current]);
      writeHistory(created, 'profile_created');
      setModal({kind: 'closed'});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAlertState({kind: 'alert', title: '저장 실패', message});
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdate = async (updatedProfile: Profile) => {
    const {photos, ...rest} = updatedProfile;
    setIsMutating(true);
    try {
      const res = await fetch(`/api/profiles/${updatedProfile.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(rest),
      });

      if (!res.ok) {
        const message = await res.text();
        setAlertState({kind: 'alert', title: '저장 실패', message});
        return;
      }

      const uploadedPhotoIds = await apiUploadPhotos(updatedProfile.id, photos);
      const profileWithPhotos = {...updatedProfile, photos: resolvePhotos(photos, uploadedPhotoIds)};
      setProfiles(current => current.map(p => (p.id === updatedProfile.id ? profileWithPhotos : p)));
      writeHistory(profileWithPhotos, 'profile_updated');
      setModal({kind: 'closed'});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAlertState({kind: 'alert', title: '저장 실패', message});
    } finally {
      setIsMutating(false);
    }
  };

  const handleStatusChange = async (profileId: string, status: ProfileStatus) => {
    if (!profiles.some(p => p.id === profileId)) return;
    setIsMutating(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status}),
      });

      if (!res.ok) return;

      const {profile: updatedProfile} = await res.json();

      if (status === 'blocked') {
        setSelectedIds(current => current.filter(id => id !== profileId));
      }

      setProfiles(current => current.map(p => (p.id === profileId ? updatedProfile : p)));
      writeHistory(updatedProfile, status === 'blocked' ? 'profile_blocked' : 'profile_activated');
    } finally {
      setIsMutating(false);
    }
  };

  const handleToggleStar = async (profile: Profile) => {
    const isMyStar = profile.starredByName === authorName;

    if (!isMyStar) {
      // 추가 전 client-side 한도 체크
      const starredSameGender = profiles.filter(
        p => p.starredByName === authorName && p.gender === profile.gender,
      );
      if (starredSameGender.length >= 2) {
        setAlertState({
          kind: 'alert',
          title: '집착매물 한도 초과',
          message: `${profile.gender === 'female' ? '여성' : '남성'} 매물은 최대 2명까지 집착매물로 지정할 수 있습니다.`,
        });
        return;
      }
    }

    setIsMutating(true);
    try {
      const method = isMyStar ? 'DELETE' : 'POST';
      const res = await fetch(`/api/profiles/${profile.id}/star`, {method});
      if (!res.ok) {
        const {message} = (await res.json()) as {message: string};
        setAlertState({kind: 'alert', title: '오류', message});
        return;
      }
      const {profile: updated} = (await res.json()) as {profile: Profile};
      setProfiles(current => current.map(p => (p.id === profile.id ? updated : p)));
    } finally {
      setIsMutating(false);
    }
  };

  const requestDelete = (profile: Profile) => {
    setAlertState({
      kind: 'confirm',
      title: '정말 삭제하시겠습니까?',
      message: `${getProfileLabel(profile)} 정보를 삭제합니다. 삭제 후에는 대시보드에서 복구할 수 없습니다.`,
      confirmLabel: '예',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setIsMutating(true);
        try {
          const res = await fetch(`/api/profiles/${profile.id}`, {method: 'DELETE'});
          if (!res.ok) return;
          setProfiles(current => current.filter(p => p.id !== profile.id));
          setSelectedIds(current => current.filter(id => id !== profile.id));
          writeHistory(profile, 'profile_deleted');
        } finally {
          setIsMutating(false);
        }
      },
    });
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {isMutating ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm" aria-label="처리 중">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-xl">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--violet-200)] border-t-[var(--violet-600)]" />
            <p className="text-sm font-bold text-[var(--violet-950)]">처리 중...</p>
          </div>
        </div>
      ) : null}
      <AppHeader page="dashboard" />

      <div className="mx-auto max-w-7xl px-4 py-6 pb-24">
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
                {genderLabels[gender]}
              </button>
            ))}
          </div>

        </section>

        <FilterBar filters={filters} onChange={setFilters} onReset={resetFilters} />

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
              전체 선택
            </label>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--violet-50)] px-3 py-1.5 text-sm font-bold text-[var(--violet-900)]">
              <Users size={16} aria-hidden />
              {isLoading ? '로딩 중...' : `${visibleProfiles.length}명 표시 · ${selectedProfiles.length}명 공유 선택`}
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-400">프로필을 불러오는 중...</div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5">
              {visibleProfiles.map(profile => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  authorName={authorName}
                  isSelected={selectedIdsSet.has(profile.id)}
                  onSelectChange={handleSelectChange}
                  onEdit={selectedProfile => setModal({kind: 'edit', profile: selectedProfile})}
                  onDelete={requestDelete}
                  onStatusChange={handleStatusChange}
                  onToggleStar={handleToggleStar}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 좌측 하단 고정: 카카오톡 공유 */}
      <div className="fixed bottom-4 left-4 z-30">
        <ShareButton profiles={selectedProfiles} />
      </div>

      {/* 우측 하단 고정: 매물 추가 */}
      <button
        className="fixed bottom-4 right-4 z-30 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[var(--violet-950)] px-5 font-bold text-white shadow-[0_12px_30px_rgba(47,13,104,0.24)] transition hover:bg-[var(--violet-900)]"
        type="button"
        onClick={() => setModal({kind: 'create'})}
      >
        <Plus size={20} aria-hidden />
        매물 추가
      </button>

      {modal.kind !== 'closed' ? (
        <ProfileFormModal
          key={modal.kind === 'edit' ? modal.profile.id : 'create'}
          mode={modal}
          authorName={authorName}
          onClose={() => setModal({kind: 'closed'})}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      ) : null}
      <CustomAlert state={alertState} onClose={() => setAlertState(closedAlertState)} />
    </main>
  );
}

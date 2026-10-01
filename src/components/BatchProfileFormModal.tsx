'use client';

import {AlertCircle, CheckCircle2, LoaderCircle, Plus, Users, X} from 'lucide-react';
import Image from 'next/image';
import {Dispatch, FormEvent, SetStateAction, useState} from 'react';

import {closedAlertState, CustomAlert, type CustomAlertState} from '@/components/CustomAlert';
import {ProfileFormFields} from '@/components/ProfileFormFields';
import {useBodyScrollLock} from '@/hooks/useBodyScrollLock';
import type {BatchCreateProgress, BatchCreateResult} from '@/lib/profiles/batch-create';
import {
  addProfileDraft,
  createProfileDraft,
  isProfileDraftStarted,
  removeProfileDraft,
  updateProfileDraft,
  updateProfileDraftAssistant,
  type ProfileDraft,
} from '@/lib/profiles/batch-drafts';
import {
  normalizeProfileFormValues,
  validateProfileFormValues,
  type ProfileFormAssistantState,
  type ProfileFormValues,
} from '@/lib/profiles/form';
import {genderLabels} from '@/lib/profiles/options';
import type {Profile} from '@/types/profile';

type BatchProfileFormModalProps = {
  authorName: string;
  onClose: () => void;
  onCreateMany: (
    profiles: Profile[],
    onProgress: (progress: BatchCreateProgress) => void,
  ) => Promise<BatchCreateResult>;
};

type DraftRegistrationStatus = 'queued' | 'registering' | 'created' | 'failed';

type SubmissionState = {
  completedCount: number;
  totalCount: number;
  statusByDraftId: Map<string, DraftRegistrationStatus>;
};

function draftLabel(draft: ProfileDraft) {
  const {values} = draft;
  const hasIdentifyingValue = values.residence.trim() || values.height.trim() || values.job.trim() || values.photos.length > 0;
  return hasIdentifyingValue ? `${genderLabels[values.gender]} · ${values.birthYear}년생` : '새 매물';
}

function draftDescription(draft: ProfileDraft) {
  const details = [draft.values.residence.trim(), draft.values.job.trim()].filter(Boolean);
  return details.length > 0 ? details.join(' · ') : '소개글 입력 전';
}

function draftToProfile(draft: ProfileDraft, authorName: string): Profile {
  const now = new Date().toISOString();
  return {
    id: draft.id,
    status: 'active',
    isActivated: true,
    authorName,
    starredByName: null,
    manualOrderWeight: 0,
    createdAt: now,
    updatedAt: now,
    ...normalizeProfileFormValues(draft.values),
  };
}

function DraftStatus({
  index,
  registrationStatus,
  isReady,
  isStarted,
}: {
  index: number;
  registrationStatus: DraftRegistrationStatus | null;
  isReady: boolean;
  isStarted: boolean;
}) {
  if (registrationStatus === 'registering') {
    return (
      <LoaderCircle
        className="shrink-0 animate-spin text-[var(--violet-600)]"
        size={16}
        aria-label={`${index}번 매물 등록 중`}
      />
    );
  }
  if (registrationStatus === 'created') {
    return (
      <CheckCircle2
        className="shrink-0 text-emerald-600"
        size={16}
        aria-label={`${index}번 매물 등록 완료`}
      />
    );
  }
  if (registrationStatus === 'failed') {
    return (
      <AlertCircle
        className="shrink-0 text-[var(--danger)]"
        size={16}
        aria-label={`${index}번 매물 등록 실패`}
      />
    );
  }
  if (registrationStatus === 'queued') {
    return (
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--violet-300)]"
        aria-label={`${index}번 매물 등록 대기`}
      />
    );
  }
  if (isReady) {
    return <CheckCircle2 className="shrink-0 text-emerald-600" size={16} aria-label="등록 준비됨" />;
  }
  if (isStarted) {
    return <AlertCircle className="shrink-0 text-amber-500" size={16} aria-label="확인 필요" />;
  }
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300" aria-label="작성 전" />;
}

function draftStatusLabel(
  registrationStatus: DraftRegistrationStatus | null,
  isReady: boolean,
  isStarted: boolean,
) {
  if (registrationStatus === 'registering') return '등록 중';
  if (registrationStatus === 'created') return '등록 완료';
  if (registrationStatus === 'failed') return '등록 실패';
  if (registrationStatus === 'queued') return '등록 대기';
  if (isReady) return '등록 준비됨';
  if (isStarted) return '확인 필요';
  return '작성 전';
}

function RegistrationProgress({completedCount, totalCount}: {completedCount: number; totalCount: number}) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const ratio = totalCount === 0 ? 0 : Math.min(completedCount / totalCount, 1);

  return (
    <div
      className="flex items-center gap-3"
      role="progressbar"
      aria-label="매물 등록 진행률"
      aria-valuemin={0}
      aria-valuemax={totalCount}
      aria-valuenow={completedCount}
    >
      <div className="relative h-11 w-11 shrink-0">
        <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44" aria-hidden>
          <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-200" />
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
            className="text-[var(--violet-600)] transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[10px] font-extrabold text-[var(--violet-900)]">
          {Math.round(ratio * 100)}%
        </span>
      </div>
      <div>
        <p className="text-sm font-extrabold text-[var(--violet-950)]">
          {completedCount} / {totalCount}
        </p>
        <p className="text-xs text-slate-500">매물을 등록하고 있어요</p>
      </div>
    </div>
  );
}

export function BatchProfileFormModal({authorName, onClose, onCreateMany}: BatchProfileFormModalProps) {
  const [drafts, setDrafts] = useState<ProfileDraft[]>(() => [createProfileDraft(crypto.randomUUID())]);
  const [activeDraftId, setActiveDraftId] = useState(() => drafts[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState | null>(null);
  const [alertState, setAlertState] = useState<CustomAlertState>(closedAlertState);
  useBodyScrollLock(true);

  const activeDraft = drafts.find(draft => draft.id === activeDraftId) ?? drafts[0];
  const activeDraftIndex = drafts.findIndex(draft => draft.id === activeDraft.id);
  const readyDrafts = drafts.filter(draft => validateProfileFormValues(draft.values).success);

  const setActiveValues: Dispatch<SetStateAction<ProfileFormValues>> = action => {
    setDrafts(current => {
      const target = current.find(draft => draft.id === activeDraftId);
      if (!target) return current;
      const nextValues = typeof action === 'function' ? action(target.values) : action;
      return updateProfileDraft(current, activeDraftId, nextValues);
    });
  };

  const setActiveAssistantState: Dispatch<SetStateAction<ProfileFormAssistantState>> = action => {
    setDrafts(current => {
      const target = current.find(draft => draft.id === activeDraftId);
      if (!target) return current;
      const nextAssistant = typeof action === 'function' ? action(target.assistant) : action;
      return updateProfileDraftAssistant(current, activeDraftId, nextAssistant);
    });
  };

  const addDraft = () => {
    const draft = createProfileDraft(crypto.randomUUID());
    setDrafts(current => addProfileDraft(current, draft));
    setActiveDraftId(draft.id);
  };

  const removeDraft = (draftId: string) => {
    const remaining = removeProfileDraft(drafts, draftId);
    if (remaining === drafts) return;
    setDrafts(remaining);
    if (draftId === activeDraftId) setActiveDraftId(remaining[0].id);
  };

  const requestClose = () => {
    if (!drafts.some(isProfileDraftStarted)) {
      onClose();
      return;
    }
    setAlertState({
      kind: 'confirm',
      title: '작성 중인 내용을 닫을까요?',
      message: '아직 등록하지 않은 사람별 입력 내용과 사진이 사라집니다.',
      confirmLabel: '닫기',
      confirmVariant: 'danger',
      onConfirm: onClose,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readyDrafts.length === 0) {
      const validation = validateProfileFormValues(activeDraft.values);
      setAlertState({
        kind: 'alert',
        title: '등록 준비된 매물이 없습니다.',
        message: validation.success ? '필수 정보를 확인해 주세요.' : validation.errors.join('\n'),
      });
      return;
    }

    setIsSubmitting(true);
    const profiles = readyDrafts.map(draft => draftToProfile(draft, authorName));
    setSubmissionState({
      completedCount: 0,
      totalCount: profiles.length,
      statusByDraftId: new Map(profiles.map(profile => [profile.id, 'queued'])),
    });
    try {
      const result = await onCreateMany(profiles, progress => {
        setSubmissionState(current => {
          if (!current) return current;
          const statusByDraftId = new Map(current.statusByDraftId);
          statusByDraftId.set(
            progress.profile.id,
            progress.phase === 'started' ? 'registering' : progress.phase === 'created' ? 'created' : 'failed',
          );
          return {
            completedCount: progress.completedCount,
            totalCount: progress.totalCount,
            statusByDraftId,
          };
        });
      });
      const createdIds = new Set(result.created.map(profile => profile.id));
      const remaining = drafts.filter(draft => !createdIds.has(draft.id));

      if (remaining.length === 0) {
        onClose();
        return;
      }

      setDrafts(current => current.filter(draft => !createdIds.has(draft.id)));
      if (createdIds.has(activeDraftId)) setActiveDraftId(remaining[0].id);
      if (result.failures.length > 0) {
        setAlertState({
          kind: 'alert',
          title: `${result.failures.length}명을 등록하지 못했습니다.`,
          message: result.failures
            .map(
              failure =>
                `${genderLabels[failure.profile.gender]} · ${failure.profile.birthYear}년생: ${failure.message}`,
            )
            .join('\n'),
        });
      } else {
        setSubmissionState(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--violet-950)]/45 sm:p-4">
      <section
        className="grid h-dvh w-full max-w-[1440px] grid-rows-[72px_minmax(0,1fr)_72px] overflow-hidden bg-white shadow-sm sm:h-[94vh] sm:rounded-[14px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-profile-form-title"
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 sm:px-6">
          <div>
            <h2 id="batch-profile-form-title" className="text-xl font-bold text-[var(--violet-950)]">
              여러 명 매물 등록
            </h2>
            <p className="mt-1 hidden text-sm text-slate-500 sm:block">소개글을 한 명씩 붙여 넣고, 확인이 끝나면 한 번에 등록하세요.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-slate-500">
              초안 {drafts.length}명
            </span>
            <button
              className="grid h-9 w-9 place-items-center rounded-[8px] text-slate-500 hover:bg-[var(--violet-50)]"
              type="button"
              disabled={isSubmitting}
              onClick={requestClose}
              aria-label="닫기"
            >
              <X size={20} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </header>

        <form className="contents" onSubmit={handleSubmit}>
          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] sm:grid-cols-[292px_minmax(0,1fr)] sm:grid-rows-1">
            <aside
              className="flex min-h-0 flex-col border-b border-[var(--border)] bg-slate-50/70 sm:border-b-0 sm:border-r"
              aria-label="등록할 사람"
            >
              <div className="px-4 py-2 sm:pb-3 sm:pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--violet-950)]">등록할 사람</span>
                  <span className="text-xs font-bold text-[var(--violet-700)]">{drafts.length}명</span>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto px-3 pb-3 sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:px-2">
                {drafts.map((draft, index) => {
                  const validation = validateProfileFormValues(draft.values);
                  const active = draft.id === activeDraftId;
                  const registrationStatus = submissionState?.statusByDraftId.get(draft.id) ?? null;
                  const primaryPhoto = draft.values.photos[0] ?? null;
                  const statusLabel = draftStatusLabel(
                    registrationStatus,
                    validation.success,
                    isProfileDraftStarted(draft),
                  );
                  return (
                    <div
                      className={`group flex w-52 shrink-0 items-center gap-2 rounded-[10px] border p-2 sm:w-auto ${
                        active ? 'border-[var(--violet-200)] bg-white shadow-sm' : 'border-transparent'
                      }`}
                      key={draft.id}
                    >
                      <button
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setActiveDraftId(draft.id)}
                        aria-label={`${index + 1}번 매물 편집, ${statusLabel}`}
                        aria-pressed={active}
                      >
                        {primaryPhoto ? (
                          <Image
                            className="h-11 w-11 shrink-0 rounded-[9px] object-cover"
                            src={primaryPhoto.url}
                            alt={`${index + 1}번 대표 사진`}
                            width={44}
                            height={44}
                            unoptimized
                          />
                        ) : (
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[9px] bg-[var(--violet-100)] text-sm font-bold text-[var(--violet-800)]">
                            {index + 1}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-800">{draftLabel(draft)}</span>
                          <span className="mt-1 block truncate text-[11px] text-slate-500">{draftDescription(draft)}</span>
                        </span>
                        <DraftStatus
                          index={index + 1}
                          registrationStatus={registrationStatus}
                          isReady={validation.success}
                          isStarted={isProfileDraftStarted(draft)}
                        />
                      </button>
                      {drafts.length > 1 ? (
                        <button
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] text-slate-400 opacity-100 hover:bg-rose-50 hover:text-[var(--danger)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => removeDraft(draft.id)}
                          aria-label={`${index + 1}번 매물 삭제`}
                        >
                          <X size={15} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
                <button
                  className="inline-flex h-[62px] w-28 shrink-0 items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-[var(--violet-300)] bg-[var(--violet-50)] text-sm font-bold text-[var(--violet-700)] disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:mx-2 sm:mb-2 sm:h-11 sm:w-auto"
                  type="button"
                  disabled={isSubmitting}
                  onClick={addDraft}
                >
                  <Plus size={16} aria-hidden /> 사람 추가
                </button>
              </div>
            </aside>

            <div className="min-w-0 overflow-y-auto bg-slate-50/40 p-3 sm:p-5">
              <div className="mx-auto max-w-5xl">
                <div className="mb-4 flex items-center gap-3 rounded-[10px] border border-[var(--violet-200)] bg-[var(--violet-50)] px-4 py-3">
                  <Users className="shrink-0 text-[var(--violet-700)]" size={20} aria-hidden />
                  <div>
                    <p className="text-sm font-bold text-[var(--violet-950)]">
                      {activeDraftIndex + 1}번 {draftLabel(activeDraft)}을 편집하고 있어요
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--violet-700)]">붙여넣는 소개글과 이미지는 이 사람에게만 추가됩니다.</p>
                  </div>
                </div>

                <ProfileFormFields
                  key={activeDraft.id}
                  values={activeDraft.values}
                  setValues={setActiveValues}
                  assistantState={activeDraft.assistant}
                  setAssistantState={setActiveAssistantState}
                  photoOwnerLabel={`${activeDraftIndex + 1}번 ${draftLabel(activeDraft)}`}
                  disabled={isSubmitting && submissionState?.statusByDraftId.has(activeDraft.id) === true}
                />
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-white px-3 sm:px-5">
            {isSubmitting && submissionState ? (
              <RegistrationProgress
                completedCount={submissionState.completedCount}
                totalCount={submissionState.totalCount}
              />
            ) : (
              <div className="text-sm text-slate-500">
                <strong className="text-slate-800">{drafts.length}명 중 {readyDrafts.length}명 준비 완료</strong>
                <span className="ml-3 hidden text-xs sm:inline">확인 필요 {drafts.length - readyDrafts.length}명</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                className="hidden h-11 rounded-[8px] border border-[var(--border)] px-5 font-semibold text-slate-600 sm:block"
                type="button"
                disabled={isSubmitting}
                onClick={requestClose}
              >
                취소
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[var(--violet-600)] px-5 font-semibold text-white hover:bg-[var(--violet-700)] disabled:bg-[var(--violet-300)]"
                type="submit"
                disabled={isSubmitting || readyDrafts.length === 0}
              >
                {isSubmitting && submissionState
                  ? `${submissionState.completedCount}/${submissionState.totalCount} 등록 중`
                  : `준비된 ${readyDrafts.length}명 등록하기`}
              </button>
            </div>
          </footer>
        </form>
      </section>
      <CustomAlert state={alertState} onClose={() => setAlertState(closedAlertState)} />
    </div>
  );
}

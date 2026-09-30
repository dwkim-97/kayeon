'use client';

import {AlertCircle, CheckCircle2, Plus, Users, X} from 'lucide-react';
import {Dispatch, FormEvent, SetStateAction, useState} from 'react';

import {closedAlertState, CustomAlert, type CustomAlertState} from '@/components/CustomAlert';
import {ProfileFormFields} from '@/components/ProfileFormFields';
import {useBodyScrollLock} from '@/hooks/useBodyScrollLock';
import type {BatchCreateResult} from '@/lib/profiles/batch-create';
import {
  addProfileDraft,
  createProfileDraft,
  isProfileDraftStarted,
  MAX_BATCH_PROFILE_COUNT,
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
  onCreateMany: (profiles: Profile[]) => Promise<BatchCreateResult>;
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

export function BatchProfileFormModal({authorName, onClose, onCreateMany}: BatchProfileFormModalProps) {
  const [drafts, setDrafts] = useState<ProfileDraft[]>(() => [createProfileDraft(crypto.randomUUID())]);
  const [activeDraftId, setActiveDraftId] = useState(() => drafts[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (drafts.length >= MAX_BATCH_PROFILE_COUNT) return;
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
    try {
      const result = await onCreateMany(readyDrafts.map(draft => draftToProfile(draft, authorName)));
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
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--violet-950)]/45 p-4">
      <section
        className="grid h-[94vh] w-full max-w-[1440px] grid-rows-[72px_minmax(0,1fr)_72px] overflow-hidden rounded-[14px] bg-white shadow-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-profile-form-title"
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-6">
          <div>
            <h2 id="batch-profile-form-title" className="text-xl font-bold text-[var(--violet-950)]">
              여러 명 매물 등록
            </h2>
            <p className="mt-1 text-sm text-slate-500">소개글을 한 명씩 붙여 넣고, 확인이 끝나면 한 번에 등록하세요.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-slate-500">
              최대 {MAX_BATCH_PROFILE_COUNT}명
            </span>
            <button
              className="grid h-9 w-9 place-items-center rounded-[8px] text-slate-500 hover:bg-[var(--violet-50)]"
              type="button"
              onClick={requestClose}
              aria-label="닫기"
            >
              <X size={20} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </header>

        <form className="contents" onSubmit={handleSubmit}>
          <div className="grid min-h-0 grid-cols-[292px_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col border-r border-[var(--border)] bg-slate-50/70">
              <div className="px-4 pb-3 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--violet-950)]">등록할 사람</span>
                  <span className="text-xs font-bold text-[var(--violet-700)]">
                    {drafts.length} / {MAX_BATCH_PROFILE_COUNT}명
                  </span>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[var(--violet-500)]"
                    style={{width: `${(drafts.length / MAX_BATCH_PROFILE_COUNT) * 100}%`}}
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-3">
                {drafts.map((draft, index) => {
                  const validation = validateProfileFormValues(draft.values);
                  const active = draft.id === activeDraftId;
                  return (
                    <div
                      className={`group flex items-center gap-2 rounded-[10px] border p-2 ${
                        active ? 'border-[var(--violet-200)] bg-white shadow-sm' : 'border-transparent'
                      }`}
                      key={draft.id}
                    >
                      <button
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setActiveDraftId(draft.id)}
                        aria-label={`${index + 1}번 매물 편집`}
                        aria-pressed={active}
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[9px] bg-[var(--violet-100)] text-sm font-bold text-[var(--violet-800)]">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-800">{draftLabel(draft)}</span>
                          <span className="mt-1 block truncate text-[11px] text-slate-500">{draftDescription(draft)}</span>
                        </span>
                        {validation.success ? (
                          <CheckCircle2 className="shrink-0 text-emerald-600" size={16} aria-label="등록 준비됨" />
                        ) : isProfileDraftStarted(draft) ? (
                          <AlertCircle className="shrink-0 text-amber-500" size={16} aria-label="확인 필요" />
                        ) : (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300" aria-label="작성 전" />
                        )}
                      </button>
                      {drafts.length > 1 ? (
                        <button
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] text-slate-400 opacity-0 hover:bg-rose-50 hover:text-[var(--danger)] group-hover:opacity-100 focus:opacity-100"
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
              </div>

              <button
                className="mx-4 mb-4 inline-flex h-11 items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-[var(--violet-300)] bg-[var(--violet-50)] text-sm font-bold text-[var(--violet-700)] disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                type="button"
                disabled={isSubmitting || drafts.length >= MAX_BATCH_PROFILE_COUNT}
                onClick={addDraft}
              >
                <Plus size={16} aria-hidden /> 사람 추가
              </button>
            </aside>

            <div className="min-w-0 overflow-y-auto bg-slate-50/40 p-5">
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
                />
              </div>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-4 border-t border-[var(--border)] bg-white px-5">
            <div className="text-sm text-slate-500">
              <strong className="text-slate-800">{drafts.length}명 중 {readyDrafts.length}명 준비 완료</strong>
              <span className="ml-3 text-xs">확인 필요 {drafts.length - readyDrafts.length}명</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-11 rounded-[8px] border border-[var(--border)] px-5 font-semibold text-slate-600"
                type="button"
                onClick={requestClose}
              >
                취소
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[var(--violet-600)] px-5 font-semibold text-white hover:bg-[var(--violet-700)] disabled:bg-[var(--violet-300)]"
                type="submit"
                disabled={isSubmitting || readyDrafts.length === 0}
              >
                {isSubmitting ? '등록 중...' : `준비된 ${readyDrafts.length}명 등록하기`}
              </button>
            </div>
          </footer>
        </form>
      </section>
      <CustomAlert state={alertState} onClose={() => setAlertState(closedAlertState)} />
    </div>
  );
}

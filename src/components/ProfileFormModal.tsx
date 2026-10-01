'use client';

import {X} from 'lucide-react';
import {FormEvent, useState} from 'react';

import {closedAlertState, CustomAlert, type CustomAlertState} from '@/components/CustomAlert';
import {ProfileFormFields} from '@/components/ProfileFormFields';
import {useBodyScrollLock} from '@/hooks/useBodyScrollLock';
import {
  createEmptyProfileFormAssistantState,
  emptyProfileFormValues,
  normalizeProfileFormValues,
  profileToFormValues,
  validateProfileFormValues,
  type ProfileFormValues,
} from '@/lib/profiles/form';
import type {Profile} from '@/types/profile';

type ModalMode =
  | {
      kind: 'create';
    }
  | {
      kind: 'edit';
      profile: Profile;
    };

type ProfileFormModalProps = {
  mode: ModalMode;
  authorName: string;
  onClose: () => void;
  onCreate: (profile: Profile) => Promise<void>;
  onUpdate: (profile: Profile) => Promise<void>;
};

export function ProfileFormModal({mode, authorName, onClose, onCreate, onUpdate}: ProfileFormModalProps) {
  const [values, setValues] = useState<ProfileFormValues>(() =>
    mode.kind === 'edit' ? profileToFormValues(mode.profile) : {...emptyProfileFormValues, photos: []},
  );
  const [assistantState, setAssistantState] = useState(createEmptyProfileFormAssistantState);
  const [alertState, setAlertState] = useState<CustomAlertState>(closedAlertState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = mode.kind === 'edit';
  useBodyScrollLock(true);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateProfileFormValues(values);

    if (!validation.success) {
      setAlertState({kind: 'alert', title: '입력 오류', message: validation.errors.join('\n')});
      return;
    }

    const normalized = normalizeProfileFormValues(values);
    const now = new Date().toISOString();

    setIsSubmitting(true);
    try {
      if (mode.kind === 'edit') {
        await onUpdate({...mode.profile, ...normalized, updatedAt: now});
      } else {
        await onCreate({
          id: crypto.randomUUID(),
          status: 'active',
          isActivated: true,
          authorName,
          starredByName: null,
          manualOrderWeight: 0,
          createdAt: now,
          updatedAt: now,
          ...normalized,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--violet-950)]/45 p-3 sm:p-4">
      <section className="max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-[8px] bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-xl font-bold text-[var(--violet-950)]">{isEdit ? '매물 정보 수정' : '매물 정보 추가'}</h2>
            <p className="mt-1 text-sm text-slate-500">사진은 최대 4장까지 등록할 수 있습니다.</p>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-[8px] text-slate-500 hover:bg-[var(--violet-50)]"
            type="button"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={20} strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <form className="max-h-[calc(94vh-80px)] overflow-y-auto p-4 sm:p-5" onSubmit={handleSubmit}>
          <ProfileFormFields
            values={values}
            setValues={setValues}
            assistantState={assistantState}
            setAssistantState={setAssistantState}
            photoOwnerLabel=""
            disabled={isSubmitting}
          />

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
            <button
              className="h-11 rounded-[8px] border border-[var(--border)] px-5 font-semibold text-slate-600"
              type="button"
              onClick={onClose}
            >
              취소
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[var(--violet-600)] px-5 font-semibold text-white hover:bg-[var(--violet-700)] disabled:bg-[var(--violet-300)]"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  저장 중
                </>
              ) : (
                '저장'
              )}
            </button>
          </div>
        </form>
      </section>
      <CustomAlert state={alertState} onClose={() => setAlertState(closedAlertState)} />
    </div>
  );
}

import {
  createEmptyProfileFormAssistantState,
  emptyProfileFormValues,
  type ProfileFormAssistantState,
  type ProfileFormValues,
} from '@/lib/profiles/form';

export type ProfileDraft = {
  id: string;
  values: ProfileFormValues;
  assistant: ProfileFormAssistantState;
};

export function createProfileDraft(id: string): ProfileDraft {
  return {
    id,
    values: {...emptyProfileFormValues, photos: []},
    assistant: createEmptyProfileFormAssistantState(),
  };
}

export function addProfileDraft(drafts: ProfileDraft[], draft: ProfileDraft): ProfileDraft[] {
  return [...drafts, draft];
}

export function updateProfileDraft(
  drafts: ProfileDraft[],
  draftId: string,
  values: ProfileFormValues,
): ProfileDraft[] {
  return drafts.map(draft => (draft.id === draftId ? {...draft, values} : draft));
}

export function updateProfileDraftAssistant(
  drafts: ProfileDraft[],
  draftId: string,
  assistant: ProfileFormAssistantState,
): ProfileDraft[] {
  return drafts.map(draft => (draft.id === draftId ? {...draft, assistant} : draft));
}

export function removeProfileDraft(drafts: ProfileDraft[], draftId: string): ProfileDraft[] {
  return drafts.length === 1 ? drafts : drafts.filter(draft => draft.id !== draftId);
}

export function isProfileDraftStarted(draft: ProfileDraft): boolean {
  if (draft.assistant.parseText.trim()) return true;

  return (Object.keys(emptyProfileFormValues) as Array<keyof ProfileFormValues>).some(field => {
    if (field === 'photos') return draft.values.photos.length > 0;
    return !Object.is(draft.values[field], emptyProfileFormValues[field]);
  });
}

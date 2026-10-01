'use client';

/* eslint-disable @next/next/no-img-element */

import {GripVertical, ImagePlus, Sparkles, X} from 'lucide-react';
import {ChangeEvent, Dispatch, DragEvent, SetStateAction, useEffect, useRef, useState} from 'react';

import {closedAlertState, CustomAlert} from '@/components/CustomAlert';
import {birthYearBounds, type ProfileFormAssistantState, type ProfileFormValues} from '@/lib/profiles/form';
import {resizeImageFile} from '@/lib/profiles/image-resize';
import {
  drinkingLabels,
  genderLabels,
  probeLabels,
  rejectionToleranceLabels,
  religionLabels,
  responseSpeedLabels,
  smokingLabels,
} from '@/lib/profiles/options';
import type {
  Drinking,
  Gender,
  Probe,
  ProfilePhoto,
  RejectionTolerance,
  Religion,
  ResponseSpeed,
  Smoking,
} from '@/types/profile';

type ProfileFormFieldsProps = {
  values: ProfileFormValues;
  setValues: Dispatch<SetStateAction<ProfileFormValues>>;
  assistantState: ProfileFormAssistantState;
  setAssistantState: Dispatch<SetStateAction<ProfileFormAssistantState>>;
  photoOwnerLabel: string;
  disabled: boolean;
};

const genderOptions: [Gender, string][] = (['female', 'male'] as Gender[]).map(value => [value, genderLabels[value]]);
const religionOptions: Religion[] = ['christian', 'buddhist', 'catholic', 'none'];
const smokingOptions: Smoking[] = ['smoker', 'non_smoker'];
const drinkingOptions: Drinking[] = ['drinker', 'non_drinker'];
const probeOptions: Probe[] = ['possible', 'impossible'];
const rejectionToleranceOptions: RejectionTolerance[] = ['high', 'mid', 'low'];
const responseSpeedOptions: ResponseSpeed[] = ['fast', 'normal', 'slow'];
const responseSpeedEmoji: Record<ResponseSpeed, string> = {
  fast: '🐰',
  normal: '🚶',
  slow: '🐢',
  not_selected: '',
};
const {oldestBirthYear, youngestBirthYear} = birthYearBounds;
const birthYearOptions = Array.from({length: youngestBirthYear - oldestBirthYear + 1}, (_, index) => {
  const year = youngestBirthYear - index;

  return [year.toString(), `${year}년생`] as [string, string];
});

export function ProfileFormFields({
  values,
  setValues,
  assistantState,
  setAssistantState,
  photoOwnerLabel,
  disabled,
}: ProfileFormFieldsProps) {
  const [draggingPhotoId, setDraggingPhotoId] = useState('');
  const [isUploadDragActive, setIsUploadDragActive] = useState(false);
  const disabledRef = useRef(disabled);
  const alertState = assistantState.feedback
    ? {kind: 'alert' as const, ...assistantState.feedback}
    : closedAlertState;

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const setFeedback = (title: string, message: string) => {
    setAssistantState(current => ({...current, feedback: {title, message}}));
  };

  const updateField = <K extends keyof ProfileFormValues>(field: K, value: ProfileFormValues[K]) => {
    setValues(current => ({...current, [field]: value}));
  };

  const handleFiles = async (uploadedFiles: File[]) => {
    if (disabledRef.current || uploadedFiles.length === 0) return;

    const remainingPhotoCount = 4 - values.photos.length;
    if (remainingPhotoCount <= 0) {
      setFeedback('사진은 최대 4장까지 등록할 수 있습니다.', '기존 사진을 삭제한 뒤 다시 추가해주세요.');
      return;
    }

    const overflowFiles = uploadedFiles.slice(remainingPhotoCount);
    const files = uploadedFiles.slice(0, remainingPhotoCount);
    const results = await Promise.all(files.map(file => resizeImageFile(file)));
    if (disabledRef.current) return;

    const failures: string[] = [];
    const nextPhotos: ProfilePhoto[] = [];

    results.forEach(result => {
      if (result.ok) {
        nextPhotos.push({
          id: crypto.randomUUID(),
          url: result.dataUrl,
          alt: `프로필 사진 ${values.photos.length + nextPhotos.length + 1}`,
          order: values.photos.length + nextPhotos.length,
        });
      } else {
        failures.push(result.reason);
      }
    });

    if (nextPhotos.length > 0) updateField('photos', [...values.photos, ...nextPhotos]);

    const messages = [...failures];
    if (overflowFiles.length > 0) {
      messages.push(`사진은 최대 4장까지만 저장되어 ${overflowFiles.length}장은 제외되었습니다.`);
    }
    if (messages.length > 0) {
      setFeedback(failures.length > 0 ? '일부 사진을 추가하지 못했습니다' : '사진 개수 안내', messages.join('\n'));
    }
  };

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    await handleFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const handlePhotoDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsUploadDragActive(false);
    await handleFiles(Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/')));
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (disabled) return;
      const items = event.clipboardData?.items;
      if (!items) return;
      const imageFiles = Array.from(items)
        .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
        .map(item => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (imageFiles.length === 0) return;
      event.preventDefault();
      void handleFiles(imageFiles);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // handleFiles depends on the active draft's current photos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, values.photos]);

  const removePhoto = (photoId: string) => {
    updateField(
      'photos',
      values.photos.filter(photo => photo.id !== photoId).map((photo, order) => ({...photo, order})),
    );
  };

  const reorderPhoto = (targetPhotoId: string) => {
    if (disabledRef.current || !draggingPhotoId || draggingPhotoId === targetPhotoId) return;

    const sourceIndex = values.photos.findIndex(photo => photo.id === draggingPhotoId);
    const targetIndex = values.photos.findIndex(photo => photo.id === targetPhotoId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextPhotos = [...values.photos];
    const [movingPhoto] = nextPhotos.splice(sourceIndex, 1);
    nextPhotos.splice(targetIndex, 0, movingPhoto);
    updateField(
      'photos',
      nextPhotos.map((photo, order) => ({...photo, order})),
    );
  };

  const handleParse = async () => {
    if (!assistantState.parseText.trim()) return;
    setAssistantState(current => ({...current, isParsing: true, parseWarnings: [], feedback: null}));
    try {
      const res = await fetch('/api/profiles/parse', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text: assistantState.parseText}),
      });
      const data = (await res.json()) as {parsed?: Record<string, unknown>; warnings?: string[]; message?: string};
      if (!res.ok) {
        setFeedback('파싱 실패', data.message ?? '오류가 발생했습니다.');
        return;
      }
      const parsed = data.parsed ?? {};
      setAssistantState(current => ({...current, parseWarnings: data.warnings ?? []}));
      if (Object.keys(parsed).length === 0) {
        setFeedback('자동입력할 정보가 없습니다.', '성별·년생·키 등 본인 정보를 명확하게 입력해 주세요.');
        return;
      }
      setValues(current => ({
        ...current,
        ...(typeof parsed.gender === 'string' ? {gender: parsed.gender as typeof current.gender} : {}),
        ...(typeof parsed.birthYear === 'number' ? {birthYear: String(parsed.birthYear)} : {}),
        ...(typeof parsed.height === 'number' ? {height: String(parsed.height)} : {}),
        ...(typeof parsed.residence === 'string' ? {residence: parsed.residence} : {}),
        ...(typeof parsed.job === 'string' ? {job: parsed.job} : {}),
        ...(typeof parsed.religion === 'string' ? {religion: parsed.religion as typeof current.religion} : {}),
        ...(typeof parsed.mbti === 'string' ? {mbti: parsed.mbti} : {}),
        ...(typeof parsed.hobbies === 'string' ? {hobbies: parsed.hobbies} : {}),
        ...(typeof parsed.smoking === 'string' ? {smoking: parsed.smoking as typeof current.smoking} : {}),
        ...(typeof parsed.drinking === 'string' ? {drinking: parsed.drinking as typeof current.drinking} : {}),
        ...(typeof parsed.idealType === 'string' ? {idealType: parsed.idealType} : {}),
        ...(typeof parsed.matchmakerComment === 'string' ? {matchmakerComment: parsed.matchmakerComment} : {}),
        ...(typeof parsed.extra === 'string' ? {extra: parsed.extra} : {}),
      }));
      setAssistantState(current => ({...current, showParseInput: false, parseText: ''}));
    } catch {
      setFeedback('자동입력 실패', '네트워크 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setAssistantState(current => ({...current, isParsing: false}));
    }
  };

  return (
    <fieldset className="contents" disabled={disabled}>
      <div className="mb-4 flex justify-end">
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--violet-200)] bg-[var(--violet-50)] px-3 text-sm font-semibold text-[var(--violet-700)] hover:bg-[var(--violet-100)]"
          type="button"
          onClick={() => setAssistantState(current => ({...current, showParseInput: !current.showParseInput}))}
        >
          <Sparkles size={15} strokeWidth={1.75} aria-hidden />
          AI 자동입력
        </button>
      </div>

      {assistantState.showParseInput ? (
        <div className="mb-4 rounded-[8px] border border-[var(--violet-200)] bg-[var(--violet-50)] p-3">
          <p className="mb-2 text-xs font-semibold text-[var(--violet-700)]">
            한 사람의 소개글만 붙여 넣어 주세요. 확인된 정보만 채우며 저장 전 검토가 필요합니다.
          </p>
          <textarea
            className="w-full resize-none rounded-[6px] border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--violet-500)]"
            rows={5}
            maxLength={12000}
            placeholder={'나이: 96년생\n키: 161cm\n직장: 고등학교 교사\n학력: 이화여대 졸\n거주: 하남 미사'}
            value={assistantState.parseText}
            onChange={event => setAssistantState(current => ({...current, parseText: event.target.value}))}
          />
          <div className="mt-2 flex justify-end">
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--violet-600)] px-4 text-sm font-semibold text-white hover:bg-[var(--violet-700)] disabled:bg-[var(--violet-300)]"
              type="button"
              disabled={assistantState.isParsing || !assistantState.parseText.trim()}
              onClick={handleParse}
            >
              {assistantState.isParsing ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  분석 중
                </>
              ) : (
                <>
                  <Sparkles size={14} strokeWidth={1.75} aria-hidden />
                  폼 채우기
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}

      {assistantState.parseWarnings.length > 0 ? (
        <div role="status" className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">자동입력 후 확인이 필요합니다</p>
          <ul className="mt-1 list-disc pl-5">
            {assistantState.parseWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <div>
          {photoOwnerLabel ? (
            <p className="mb-2 text-xs font-semibold text-[var(--violet-700)]">{photoOwnerLabel}에게 사진 추가 중</p>
          ) : null}
          <label
            className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-[8px] border border-dashed px-4 text-center text-[var(--violet-800)] transition ${
              isUploadDragActive
                ? 'border-[var(--violet-600)] bg-[var(--violet-100)]'
                : 'border-[var(--violet-300)] bg-[var(--violet-50)]'
            }`}
            onDragEnter={() => {
              if (!disabledRef.current) setIsUploadDragActive(true);
            }}
            onDragOver={event => event.preventDefault()}
            onDragLeave={() => setIsUploadDragActive(false)}
            onDrop={handlePhotoDrop}
          >
            <ImagePlus size={28} strokeWidth={1.75} aria-hidden />
            <span className="mt-2 text-sm font-semibold">사진 업로드 *</span>
            <span className="mt-1 text-xs text-slate-500">{values.photos.length}/4</span>
            <span className="mt-1.5 text-[11px] leading-4 text-slate-400">클릭·드래그 또는 붙여넣기(Ctrl/⌘+V)</span>
            <input className="sr-only" type="file" accept="image/*" multiple onChange={handlePhotoUpload} />
          </label>

          <div
            className="mt-3 grid grid-cols-2 gap-2"
            onPointerMove={event => {
              if (!draggingPhotoId) return;
              const element = document.elementFromPoint(event.clientX, event.clientY);
              const cell = element?.closest('[data-photo-id]') as HTMLElement | null;
              const targetId = cell?.dataset.photoId;
              if (targetId && targetId !== draggingPhotoId) reorderPhoto(targetId);
            }}
            onPointerUp={() => setDraggingPhotoId('')}
            onPointerCancel={() => setDraggingPhotoId('')}
          >
            {values.photos.map(photo => (
              <div
                className={`relative aspect-square overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--violet-100)] transition-opacity ${
                  draggingPhotoId === photo.id ? 'opacity-40' : ''
                }`}
                key={photo.id}
                data-photo-id={photo.id}
              >
                <img className="pointer-events-none h-full w-full object-cover" src={photo.url} alt={photo.alt} />
                <span
                  className="absolute left-1 top-1 grid h-7 w-7 cursor-grab touch-none place-items-center rounded-full bg-white/90 text-[var(--violet-800)] active:cursor-grabbing"
                  onPointerDown={event => {
                    if (disabledRef.current) return;
                    event.preventDefault();
                    setDraggingPhotoId(photo.id);
                  }}
                >
                  <GripVertical size={15} strokeWidth={1.75} aria-hidden />
                </span>
                <button
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-[var(--danger)]"
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  aria-label="사진 삭제"
                >
                  <X size={15} strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <fieldset className="rounded-[10px] border border-[var(--border)] p-4">
            <legend className="px-2 text-sm font-semibold text-[var(--violet-700)]">주요 정보</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <RadioGroup<Gender>
                label="성별"
                required={true}
                value={values.gender}
                options={genderOptions}
                onChange={value => updateField('gender', value)}
                deselectValue={null}
              />
              <SelectField
                label="년생"
                required={true}
                value={values.birthYear}
                options={birthYearOptions}
                onChange={value => updateField('birthYear', value)}
              />
              <TextField
                label="키"
                required={true}
                type="number"
                placeholder="164"
                value={values.height}
                onChange={value => updateField('height', value)}
              />
              <TextField
                label="사는 곳"
                required={true}
                type="text"
                placeholder="서울 강남구"
                value={values.residence}
                onChange={value => updateField('residence', value)}
              />
              <TextField
                label="회사명/위치/업종"
                required={true}
                type="text"
                placeholder="카카오 / 판교 / IT"
                value={values.job}
                onChange={value => updateField('job', value)}
              />
            </div>
          </fieldset>

          <fieldset className="rounded-[10px] border border-[var(--border)] p-4">
            <legend className="px-2 text-sm font-semibold text-slate-500">추가 정보</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <RadioGroup<Religion>
                label="종교"
                required={false}
                value={values.religion}
                options={religionOptions.map(value => [value, religionLabels[value]])}
                onChange={value => updateField('religion', value)}
                deselectValue="not_selected"
              />
              <RadioGroup<Smoking>
                label="흡연"
                required={false}
                value={values.smoking}
                options={smokingOptions.map(value => [value, smokingLabels[value]])}
                onChange={value => updateField('smoking', value)}
                deselectValue="not_selected"
              />
              <RadioGroup<Drinking>
                label="음주"
                required={false}
                value={values.drinking}
                options={drinkingOptions.map(value => [value, drinkingLabels[value]])}
                onChange={value => updateField('drinking', value)}
                deselectValue="not_selected"
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField
                label="MBTI"
                required={false}
                type="text"
                placeholder="ENFJ"
                value={values.mbti}
                onChange={value => updateField('mbti', value.toUpperCase())}
              />
              <TextField
                label="취미"
                required={false}
                type="text"
                placeholder="독서, 러닝"
                value={values.hobbies}
                onChange={value => updateField('hobbies', value)}
              />
              <TextArea
                label="이상형"
                required={false}
                placeholder="다정한 사람, 대화가 잘 통하는 사람"
                value={values.idealType}
                onChange={value => updateField('idealType', value)}
              />
              <TextArea
                label="주선자 코멘트"
                required={false}
                placeholder="예의 있음, 일정 조율 빠름"
                value={values.matchmakerComment}
                onChange={value => updateField('matchmakerComment', value)}
              />
              <TextArea
                label="기타"
                required={false}
                placeholder="해외 거주 경험"
                value={values.extra}
                onChange={value => updateField('extra', value)}
              />
            </div>
          </fieldset>

          <fieldset className="rounded-[10px] border border-amber-300 bg-amber-50/60 p-4">
            <legend className="px-2 text-sm font-semibold text-amber-700">관리자 메모</legend>
            <p className="mb-2 text-xs text-amber-700/80">주선자만 보는 내부 메모입니다. 공유 화면에는 나오지 않습니다.</p>
            <textarea
              className="min-h-24 w-full resize-y rounded-[8px] border border-amber-300 bg-white px-3 py-2 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              placeholder="예: 연락 느림, 사진 실물과 차이, 소개 시 주의사항"
              value={values.adminMemo}
              onChange={event => updateField('adminMemo', event.target.value)}
            />

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <RadioGroup<Probe>
                label="떠보기"
                required={false}
                value={values.probe}
                options={probeOptions.map(value => [value, probeLabels[value]])}
                onChange={value => updateField('probe', value)}
                deselectValue="not_selected"
              />
              <RadioGroup<RejectionTolerance>
                label="거절내성"
                required={false}
                value={values.rejectionTolerance}
                options={rejectionToleranceOptions.map(value => [value, rejectionToleranceLabels[value]])}
                onChange={value => updateField('rejectionTolerance', value)}
                deselectValue="not_selected"
              />
              <RadioGroup<ResponseSpeed>
                label="응답속도"
                required={false}
                value={values.responseSpeed}
                options={responseSpeedOptions.map(value => [value, `${responseSpeedEmoji[value]} ${responseSpeedLabels[value]}`])}
                onChange={value => updateField('responseSpeed', value)}
                deselectValue="not_selected"
              />
            </div>
            <div className="mt-4">
              <TextField
                label="리워드"
                required={false}
                type="text"
                placeholder="예: 소개비 50만원, 명품 선물"
                value={values.reward}
                onChange={value => updateField('reward', value)}
              />
            </div>
          </fieldset>
        </div>
      </div>

      <CustomAlert
        state={alertState}
        onClose={() => setAssistantState(current => ({...current, feedback: null}))}
      />
    </fieldset>
  );
}

function TextField({
  label,
  required,
  value,
  onChange,
  type,
  placeholder,
}: {
  label: string;
  required: boolean;
  value: string;
  onChange: (value: string) => void;
  type: 'text' | 'number';
  placeholder: string;
}) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <input
        className="h-10 w-full rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)] focus:ring-4 focus:ring-[var(--violet-100)]"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  required,
  value,
  options,
  onChange,
}: {
  label: string;
  required: boolean;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <select
        className="h-10 w-full rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)] focus:ring-4 focus:ring-[var(--violet-100)]"
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  required,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  required: boolean;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block sm:col-span-2">
      <FieldLabel label={label} required={required} />
      <textarea
        className="min-h-24 w-full resize-y rounded-[8px] border border-[var(--border)] px-3 py-2 outline-none focus:border-[var(--violet-500)] focus:ring-4 focus:ring-[var(--violet-100)]"
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

function RadioGroup<TValue extends string>({
  label,
  required,
  value,
  options,
  onChange,
  deselectValue,
}: {
  label: string;
  required: boolean;
  value: TValue;
  options: Array<[TValue, string]>;
  onChange: (value: TValue) => void;
  deselectValue: TValue | null;
}) {
  return (
    <fieldset>
      <legend>
        <FieldLabel label={label} required={required} />
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([optionValue, optionLabel]) => {
          const isSelected = value === optionValue;
          return (
            <button
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                isSelected
                  ? 'border-[var(--violet-600)] bg-[var(--violet-600)] text-white'
                  : 'border-[var(--border)] bg-[var(--violet-50)] text-[var(--violet-900)]'
              }`}
              key={optionValue}
              type="button"
              onClick={() => onChange(isSelected && deselectValue !== null ? deselectValue : optionValue)}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function FieldLabel({label, required}: {label: string; required: boolean}) {
  return (
    <span className="mb-1.5 block text-sm font-semibold text-[var(--violet-900)]">
      {label} {required ? <span className="text-[var(--danger)]">*</span> : null}
    </span>
  );
}

'use client';

/* eslint-disable @next/next/no-img-element */

import {GripVertical, ImagePlus, X} from 'lucide-react';
import {ChangeEvent, DragEvent, FormEvent, useState} from 'react';

import {closedAlertState, CustomAlert, type CustomAlertState} from '@/components/CustomAlert';
import {
  emptyProfileFormValues,
  normalizeProfileFormValues,
  profileToFormValues,
  validateProfileFormValues,
  type ProfileFormValues,
} from '@/lib/profiles/form';
import {drinkingLabels, religionLabels, smokingLabels} from '@/lib/profiles/options';
import type {Drinking, Gender, Profile, ProfilePhoto, Religion, Smoking} from '@/types/profile';

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
  onCreate: (profile: Profile) => void;
  onUpdate: (profile: Profile) => void;
};

const religionOptions: Religion[] = ['christian', 'buddhist', 'catholic', 'none'];
const smokingOptions: Smoking[] = ['smoker', 'non_smoker'];
const drinkingOptions: Drinking[] = ['drinker', 'non_drinker'];

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ProfileFormModal({mode, authorName, onClose, onCreate, onUpdate}: ProfileFormModalProps) {
  const [values, setValues] = useState<ProfileFormValues>(() =>
    mode.kind === 'edit' ? profileToFormValues(mode.profile) : emptyProfileFormValues,
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [alertState, setAlertState] = useState<CustomAlertState>(closedAlertState);
  const [draggingPhotoId, setDraggingPhotoId] = useState('');
  const [isUploadDragActive, setIsUploadDragActive] = useState(false);
  const isEdit = mode.kind === 'edit';

  const updateField = <K extends keyof ProfileFormValues>(field: K, value: ProfileFormValues[K]) => {
    setValues(current => ({...current, [field]: value}));
  };

  const handleFiles = async (uploadedFiles: File[]) => {
    if (uploadedFiles.length === 0) {
      return;
    }

    const remainingPhotoCount = 4 - values.photos.length;

    if (uploadedFiles.length > remainingPhotoCount) {
      setAlertState({
        kind: 'alert',
        title: '사진은 최대 4장까지 등록할 수 있습니다.',
        message: '이미 등록된 사진을 포함해 최대 4장만 저장됩니다.',
      });
    }

    if (remainingPhotoCount <= 0) {
      return;
    }

    const files = uploadedFiles.slice(0, remainingPhotoCount);
    const urls = await Promise.all(files.map(readFileAsDataUrl));
    const nextPhotos: ProfilePhoto[] = urls.map((url, index) => ({
      id: crypto.randomUUID(),
      url,
      alt: `프로필 사진 ${values.photos.length + index + 1}`,
      order: values.photos.length + index,
    }));
    updateField('photos', [...values.photos, ...nextPhotos]);
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

  const removePhoto = (photoId: string) => {
    updateField(
      'photos',
      values.photos.filter(photo => photo.id !== photoId).map((photo, order) => ({...photo, order})),
    );
  };

  const reorderPhoto = (targetPhotoId: string) => {
    if (!draggingPhotoId || draggingPhotoId === targetPhotoId) {
      return;
    }

    const sourceIndex = values.photos.findIndex(photo => photo.id === draggingPhotoId);
    const targetIndex = values.photos.findIndex(photo => photo.id === targetPhotoId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextPhotos = [...values.photos];
    const [movingPhoto] = nextPhotos.splice(sourceIndex, 1);
    nextPhotos.splice(targetIndex, 0, movingPhoto);
    updateField(
      'photos',
      nextPhotos.map((photo, order) => ({...photo, order})),
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateProfileFormValues(values);

    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    const normalized = normalizeProfileFormValues(values);
    const now = new Date().toISOString();

    if (mode.kind === 'edit') {
      onUpdate({
        ...mode.profile,
        ...normalized,
        updatedAt: now,
      });
      return;
    }

    onCreate({
      id: crypto.randomUUID(),
      status: 'active',
      authorName,
      createdAt: now,
      updatedAt: now,
      ...normalized,
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--violet-950)]/45 p-3 sm:p-4">
      <section className="max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-[8px] bg-white shadow-[0_28px_90px_rgba(47,13,104,0.26)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--violet-950)]">
              {isEdit ? '인물 정보 수정' : '인물 정보 추가'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">사진은 최대 4장까지 등록할 수 있습니다.</p>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-[8px] text-slate-500 hover:bg-[var(--violet-50)]"
            type="button"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <form className="max-h-[calc(94vh-80px)] overflow-y-auto p-4 sm:p-5" onSubmit={handleSubmit}>
          {errors.length > 0 ? (
            <div className="mb-4 rounded-[8px] border border-red-100 bg-red-50 p-3 text-sm font-semibold text-[var(--danger)]">
              {errors.map(error => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
            <div>
              <label
                className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-[8px] border border-dashed px-4 text-center text-[var(--violet-800)] transition ${
                  isUploadDragActive
                    ? 'border-[var(--violet-600)] bg-[var(--violet-100)]'
                    : 'border-[var(--violet-300)] bg-[var(--violet-50)]'
                }`}
                onDragEnter={() => setIsUploadDragActive(true)}
                onDragOver={event => event.preventDefault()}
                onDragLeave={() => setIsUploadDragActive(false)}
                onDrop={handlePhotoDrop}
              >
                <ImagePlus size={28} aria-hidden />
                <span className="mt-2 text-sm font-bold">사진 업로드 *</span>
                <span className="mt-1 text-xs text-slate-500">{values.photos.length}/4</span>
                <input className="sr-only" type="file" accept="image/*" multiple onChange={handlePhotoUpload} />
              </label>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {values.photos.map(photo => (
                  <div
                    className="relative aspect-square overflow-hidden rounded-[8px] border border-[var(--violet-100)] bg-[var(--violet-100)]"
                    draggable
                    key={photo.id}
                    onDragStart={event => {
                      setDraggingPhotoId(photo.id);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={event => event.preventDefault()}
                    onDrop={() => reorderPhoto(photo.id)}
                    onDragEnd={() => setDraggingPhotoId('')}
                  >
                    <img className="h-full w-full object-cover" src={photo.url} alt={photo.alt} />
                    <span className="absolute left-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-[var(--violet-800)]">
                      <GripVertical size={15} aria-hidden />
                    </span>
                    <button
                      className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-[var(--danger)]"
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      aria-label="사진 삭제"
                    >
                      <X size={15} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <RadioGroup<Gender>
                label="성별"
                required={true}
                value={values.gender}
                options={[
                  ['female', '여성'],
                  ['male', '남성'],
                ]}
                onChange={value => updateField('gender', value)}
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
                label="나이"
                required={true}
                type="number"
                placeholder="29"
                value={values.age}
                onChange={value => updateField('age', value)}
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
                label="회사명/위치/업종"
                required={true}
                type="text"
                placeholder="카카오 / 판교 / IT"
                value={values.job}
                onChange={value => updateField('job', value)}
              />
              <RadioGroup<Religion>
                label="종교"
                required={false}
                value={values.religion}
                options={religionOptions.map(value => [value, religionLabels[value]])}
                onChange={value => updateField('religion', value)}
              />
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
              <RadioGroup<Smoking>
                label="흡연"
                required={false}
                value={values.smoking}
                options={smokingOptions.map(value => [value, smokingLabels[value]])}
                onChange={value => updateField('smoking', value)}
              />
              <RadioGroup<Drinking>
                label="음주"
                required={false}
                value={values.drinking}
                options={drinkingOptions.map(value => [value, drinkingLabels[value]])}
                onChange={value => updateField('drinking', value)}
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
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
            <button className="h-11 rounded-[8px] border border-[var(--border)] px-5 font-bold text-slate-600" type="button" onClick={onClose}>
              취소
            </button>
            <button className="h-11 rounded-[8px] bg-[var(--violet-600)] px-5 font-bold text-white hover:bg-[var(--violet-700)]" type="submit">
              저장
            </button>
          </div>
        </form>
      </section>
      <CustomAlert state={alertState} onClose={() => setAlertState(closedAlertState)} />
    </div>
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
}: {
  label: string;
  required: boolean;
  value: TValue;
  options: Array<[TValue, string]>;
  onChange: (value: TValue) => void;
}) {
  return (
    <fieldset>
      <legend>
        <FieldLabel label={label} required={required} />
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([optionValue, optionLabel]) => (
          <button
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
              value === optionValue
                ? 'border-[var(--violet-600)] bg-[var(--violet-600)] text-white'
                : 'border-[var(--violet-200)] bg-[var(--violet-50)] text-[var(--violet-900)]'
            }`}
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function FieldLabel({label, required}: {label: string; required: boolean}) {
  return (
    <span className="mb-2 block text-sm font-bold text-slate-700">
      {label}
      {required ? <span className="ml-1 text-[var(--danger)]">*</span> : null}
    </span>
  );
}

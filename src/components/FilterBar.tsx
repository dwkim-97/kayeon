'use client';

import {RotateCcw, Search} from 'lucide-react';

import {religionLabels, smokingLabels} from '@/lib/profiles/options';
import type {NumericComparison, ProfileFilters, Religion, Smoking} from '@/types/profile';

type FilterBarProps = {
  filters: ProfileFilters;
  onChange: (filters: ProfileFilters) => void;
  onReset: () => void;
};

const religionOptions: Religion[] = ['christian', 'buddhist', 'catholic', 'not_selected'];
const smokingOptions: Smoking[] = ['smoker', 'non_smoker'];
const numericComparisonOptions: Array<[NumericComparison, string]> = [
  ['gte', '이상'],
  ['lte', '이하'],
];

export function FilterBar({filters, onChange, onReset}: FilterBarProps) {
  const toggleReligion = (religion: Religion) => {
    const religions = filters.religions.includes(religion)
      ? filters.religions.filter(value => value !== religion)
      : [...filters.religions, religion];
    onChange({...filters, religions});
  };

  const toggleSmoking = (smoking: Smoking) => {
    const smokingValues = filters.smoking.includes(smoking)
      ? filters.smoking.filter(value => value !== smoking)
      : [...filters.smoking, smoking];
    onChange({...filters, smoking: smokingValues});
  };

  return (
    <section className="rounded-[8px] border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
        <label className="flex h-12 items-center rounded-[8px] border border-[var(--border)] bg-white px-3 transition focus-within:border-[var(--violet-500)] focus-within:ring-4 focus-within:ring-[var(--violet-100)]">
          <Search className="shrink-0 text-slate-400" size={17} aria-hidden />
          <input
            className="h-full min-w-0 flex-1 border-0 bg-transparent pl-3 outline-none"
            value={filters.query}
            onChange={event => onChange({...filters, query: event.target.value})}
            placeholder="검색"
          />
        </label>

        <fieldset className="rounded-[8px] border border-[var(--border)] p-2">
          <legend className="px-1 text-xs font-extrabold text-[var(--violet-800)]">년생</legend>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <input
              className="h-10 rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)]"
              type="number"
              value={filters.birthYearValue}
              onChange={event => onChange({...filters, birthYearValue: event.target.value})}
              aria-label="년생 기준값"
              placeholder="1995"
            />
            <select
              className="h-10 rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)]"
              value={filters.birthYearComparison}
              onChange={event => onChange({...filters, birthYearComparison: event.target.value as NumericComparison})}
              aria-label="년생 이상 이하"
            >
              {numericComparisonOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        <fieldset className="rounded-[8px] border border-[var(--border)] p-2">
          <legend className="px-1 text-xs font-extrabold text-[var(--violet-800)]">키</legend>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <input
              className="h-10 rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)]"
              type="number"
              value={filters.heightValue}
              onChange={event => onChange({...filters, heightValue: event.target.value})}
              aria-label="키 기준값"
              placeholder="특정 값"
            />
            <select
              className="h-10 rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)]"
              value={filters.heightComparison}
              onChange={event => onChange({...filters, heightComparison: event.target.value as NumericComparison})}
              aria-label="키 이상 이하"
            >
              {numericComparisonOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <label
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
              filters.activeOnly
                ? 'border-[var(--violet-600)] bg-[var(--violet-600)] text-white'
                : 'border-[var(--violet-200)] bg-[var(--violet-50)] text-[var(--violet-900)]'
            }`}
          >
            <input
              className="h-4 w-4 accent-[var(--violet-600)]"
              type="checkbox"
              checked={filters.activeOnly}
              onChange={event => onChange({...filters, activeOnly: event.target.checked})}
            />
            활성화된 매물만 보기
          </label>
          {religionOptions.map(religion => (
            <button
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                filters.religions.includes(religion)
                  ? 'border-[var(--violet-600)] bg-[var(--violet-600)] text-white'
                  : 'border-[var(--violet-200)] bg-[var(--violet-50)] text-[var(--violet-900)]'
              }`}
              key={religion}
              type="button"
              onClick={() => toggleReligion(religion)}
            >
              {religionLabels[religion]}
            </button>
          ))}
          {smokingOptions.map(smoking => (
            <button
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                filters.smoking.includes(smoking)
                  ? 'border-[var(--violet-600)] bg-[var(--violet-600)] text-white'
                  : 'border-[var(--violet-200)] bg-[var(--violet-50)] text-[var(--violet-900)]'
              }`}
              key={smoking}
              type="button"
              onClick={() => toggleSmoking(smoking)}
            >
              {smokingLabels[smoking]}
            </button>
          ))}
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[var(--violet-200)] bg-white px-3 text-sm font-bold text-[var(--violet-900)] transition hover:bg-[var(--violet-50)] sm:ml-auto"
          type="button"
          onClick={onReset}
        >
          <RotateCcw size={15} aria-hidden />
          필터 초기화
        </button>
      </div>
    </section>
  );
}

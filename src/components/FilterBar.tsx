'use client';

import {RotateCcw, Search} from 'lucide-react';

import {religionLabels, smokingLabels} from '@/lib/profiles/options';
import type {NumericComparison, ProfileFilters, Religion, Smoking} from '@/types/profile';

type FilterBarProps = {
  filters: ProfileFilters;
  onChange: (filters: ProfileFilters) => void;
  onReset: () => void;
};

const religionOptions: Array<[Religion | '', string]> = [
  ['', '전체'],
  ['christian', religionLabels['christian']],
  ['buddhist', religionLabels['buddhist']],
  ['catholic', religionLabels['catholic']],
  ['not_selected', '미선택'],
];

const smokingOptions: Array<[Smoking | '', string]> = [
  ['', '전체'],
  ['smoker', smokingLabels['smoker']],
  ['non_smoker', smokingLabels['non_smoker']],
];

// 나이(birthYear)는 "이상"이 오래된 연도(더 나이 많음), "이하"가 최근 연도(더 어림)
// 예: 1997년생 이상 → 1996년생 이전 포함 (birthYear <= 1997 - 1 = lte 방향)
const birthYearComparisonOptions: Array<[NumericComparison, string]> = [
  ['lte', '이상'],
  ['gte', '이하'],
];

const heightComparisonOptions: Array<[NumericComparison, string]> = [
  ['gte', '이상'],
  ['lte', '이하'],
];

const selectClass =
  'h-10 w-full rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)] focus:ring-4 focus:ring-[var(--violet-100)]';

export function FilterBar({filters, onChange, onReset}: FilterBarProps) {
  return (
    <section className="rounded-[8px] border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
        <label className="flex h-12 items-center rounded-[8px] border border-[var(--border)] bg-white px-3 transition focus-within:border-[var(--violet-500)] focus-within:ring-4 focus-within:ring-[var(--violet-100)] sm:col-span-2 lg:col-span-1">
          <Search className="shrink-0 text-slate-400" size={17} strokeWidth={1.75} aria-hidden />
          <input
            className="h-full min-w-0 flex-1 border-0 bg-transparent pl-3 outline-none"
            value={filters.query}
            onChange={event => onChange({...filters, query: event.target.value})}
            placeholder="검색"
          />
        </label>

        <fieldset className="rounded-[8px] border border-[var(--border)] p-2">
          <legend className="px-1 text-xs font-semibold text-[var(--violet-800)]">년생</legend>
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <input
              className="h-10 rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)]"
              type="number"
              value={filters.birthYearValue}
              onChange={event => onChange({...filters, birthYearValue: event.target.value})}
              aria-label="년생 기준값"
              placeholder="1995"
            />
            <select
              className="h-10 rounded-[8px] border border-[var(--border)] px-2 outline-none focus:border-[var(--violet-500)]"
              value={filters.birthYearComparison}
              onChange={event => onChange({...filters, birthYearComparison: event.target.value as NumericComparison})}
              aria-label="년생 이상 이하"
            >
              {birthYearComparisonOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </fieldset>

        <fieldset className="rounded-[8px] border border-[var(--border)] p-2">
          <legend className="px-1 text-xs font-semibold text-[var(--violet-800)]">키</legend>
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <input
              className="h-10 rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)]"
              type="number"
              value={filters.heightValue}
              onChange={event => onChange({...filters, heightValue: event.target.value})}
              aria-label="키 기준값"
              placeholder="키"
            />
            <select
              className="h-10 rounded-[8px] border border-[var(--border)] px-2 outline-none focus:border-[var(--violet-500)]"
              value={filters.heightComparison}
              onChange={event => onChange({...filters, heightComparison: event.target.value as NumericComparison})}
              aria-label="키 이상 이하"
            >
              {heightComparisonOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </fieldset>

        <fieldset className="rounded-[8px] border border-[var(--border)] p-2">
          <legend className="px-1 text-xs font-semibold text-[var(--violet-800)]">종교</legend>
          <select
            className={selectClass}
            value={filters.religion}
            onChange={event => onChange({...filters, religion: event.target.value as Religion | ''})}
            aria-label="종교 필터"
          >
            {religionOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </fieldset>

        <fieldset className="rounded-[8px] border border-[var(--border)] p-2">
          <legend className="px-1 text-xs font-semibold text-[var(--violet-800)]">흡연</legend>
          <select
            className={selectClass}
            value={filters.smoking}
            onChange={event => onChange({...filters, smoking: event.target.value as Smoking | ''})}
            aria-label="흡연 필터"
          >
            {smokingOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </fieldset>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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

        <button
          className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--violet-900)] transition hover:bg-[var(--violet-50)]"
          type="button"
          onClick={onReset}
        >
          <RotateCcw size={15} strokeWidth={1.75} aria-hidden />
          필터 초기화
        </button>
      </div>
    </section>
  );
}

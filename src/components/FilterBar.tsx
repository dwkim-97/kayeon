'use client';

import {Search} from 'lucide-react';

import {religionLabels, smokingLabels} from '@/lib/profiles/options';
import type {ProfileFilters, Religion, Smoking} from '@/types/profile';

type FilterBarProps = {
  filters: ProfileFilters;
  onChange: (filters: ProfileFilters) => void;
};

const religionOptions: Religion[] = ['christian', 'buddhist', 'catholic', 'none'];
const smokingOptions: Smoking[] = ['smoker', 'non_smoker'];

export function FilterBar({filters, onChange}: FilterBarProps) {
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
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden />
          <input
            className="h-11 w-full rounded-[8px] border border-[var(--border)] pl-10 pr-3 outline-none transition focus:border-[var(--violet-500)] focus:ring-4 focus:ring-[var(--violet-100)]"
            value={filters.query}
            onChange={event => onChange({...filters, query: event.target.value})}
            placeholder="검색"
          />
        </label>

        <fieldset className="rounded-[8px] border border-[var(--border)] p-2">
          <legend className="px-1 text-xs font-extrabold text-[var(--violet-800)]">나이</legend>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="h-10 rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)]"
              type="number"
              value={filters.minAge}
              onChange={event => onChange({...filters, minAge: Number(event.target.value)})}
              aria-label="최소 나이"
              placeholder="이상"
            />
            <input
              className="h-10 rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)]"
              type="number"
              value={filters.maxAge}
              onChange={event => onChange({...filters, maxAge: Number(event.target.value)})}
              aria-label="최대 나이"
              placeholder="이하"
            />
          </div>
        </fieldset>

        <fieldset className="rounded-[8px] border border-[var(--border)] p-2">
          <legend className="px-1 text-xs font-extrabold text-[var(--violet-800)]">키</legend>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="h-10 rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)]"
              type="number"
              value={filters.minHeight}
              onChange={event => onChange({...filters, minHeight: Number(event.target.value)})}
              aria-label="최소 키"
              placeholder="이상"
            />
            <input
              className="h-10 rounded-[8px] border border-[var(--border)] px-3 outline-none focus:border-[var(--violet-500)]"
              type="number"
              value={filters.maxHeight}
              onChange={event => onChange({...filters, maxHeight: Number(event.target.value)})}
              aria-label="최대 키"
              placeholder="이하"
            />
          </div>
        </fieldset>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
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
    </section>
  );
}

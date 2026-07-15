import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {SortMenu} from './SortMenu';
import type {ProfileFilters} from '@/types/profile';

const baseFilters: ProfileFilters = {
  gender: 'female',
  birthYearValue: '',
  birthYearComparison: 'gte',
  heightValue: '',
  heightComparison: 'gte',
  activeOnly: false,
  religion: '',
  smoking: '',
  authorNames: ['에드', '조이', '에이든'],
  query: '',
  sortField: 'default',
  sortDirection: 'desc',
};

describe('SortMenu', () => {
  it('is collapsed by default (panel not rendered)', () => {
    render(<SortMenu filters={baseFilters} onChange={vi.fn()} />);
    expect(screen.queryByRole('dialog', {name: '정렬 옵션'})).toBeNull();
  });

  it('opens the panel on click and shows sort fields', () => {
    render(<SortMenu filters={baseFilters} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', {name: '정렬 옵션 열기'}));
    const panel = screen.getByRole('dialog', {name: '정렬 옵션'});
    expect(panel).toBeInTheDocument();
    expect(screen.getByText('나이순')).toBeInTheDocument();
    expect(screen.getByText('키순')).toBeInTheDocument();
    expect(screen.getByText('등록일순')).toBeInTheDocument();
  });

  it('calls onChange with the chosen sort field', () => {
    const onChange = vi.fn();
    render(<SortMenu filters={baseFilters} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', {name: '정렬 옵션 열기'}));
    fireEvent.click(screen.getByText('나이순'));
    expect(onChange).toHaveBeenCalledWith({...baseFilters, sortField: 'age'});
  });

  it('calls onChange with the chosen direction', () => {
    const onChange = vi.fn();
    render(<SortMenu filters={{...baseFilters, sortField: 'age'}} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', {name: '정렬 옵션 열기'}));
    // 나이순일 때 방향 라벨은 "어린 순" / "나이 많은 순"
    fireEvent.click(screen.getByText('어린 순'));
    expect(onChange).toHaveBeenCalledWith({...baseFilters, sortField: 'age', sortDirection: 'asc'});
  });

  it('reflects the active sort in the button label', () => {
    render(<SortMenu filters={{...baseFilters, sortField: 'height', sortDirection: 'asc'}} onChange={vi.fn()} />);
    // aria-label은 고정이므로 표시 텍스트로 확인
    expect(screen.getByText('키순 · 작은 순')).toBeInTheDocument();
  });

  it('disables the direction buttons while sort field is default', () => {
    render(<SortMenu filters={baseFilters} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', {name: '정렬 옵션 열기'}));
    expect(screen.getByRole('button', {name: /오름차순/})).toBeDisabled();
    expect(screen.getByRole('button', {name: /내림차순/})).toBeDisabled();
  });
});

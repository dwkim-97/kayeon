import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';

import {FilterBar} from './FilterBar';
import type {ProfileFilters} from '@/types/profile';

const filters: ProfileFilters = {
  gender: 'female',
  birthYearValue: '1998',
  birthYearComparison: 'gte',
  heightValue: '170',
  heightComparison: 'lte',
  activeOnly: true,
  religions: ['not_selected'],
  smoking: ['non_smoker'],
  query: '강남',
};

describe('FilterBar', () => {
  it('shows a filter reset button and calls the reset handler', async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();

    render(<FilterBar filters={filters} onChange={vi.fn()} onReset={handleReset} />);

    await user.click(screen.getByRole('button', {name: '필터 초기화'}));

    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('shows an active-only checkbox and updates the filter value', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<FilterBar filters={filters} onChange={handleChange} onReset={vi.fn()} />);

    await user.click(screen.getByLabelText('활성화된 매물만 보기'));

    expect(handleChange).toHaveBeenCalledWith({...filters, activeOnly: false});
  });
});

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {Dashboard} from './Dashboard';

describe('Dashboard', () => {
  it('labels the current grid selection checkbox as all select', () => {
    render(<Dashboard />);

    expect(screen.getByLabelText('전체 선택')).toBeInTheDocument();
    expect(screen.queryByLabelText('현재 grid active 전체 선택')).not.toBeInTheDocument();
  });
});

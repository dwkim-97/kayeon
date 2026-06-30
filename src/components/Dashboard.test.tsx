import {render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {Dashboard} from './Dashboard';

describe('Dashboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('labels the current grid selection checkbox as all select', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({profiles: []}), {status: 200}),
    );

    render(<Dashboard authorName="Aiden" />);

    expect(screen.getByLabelText('전체 선택')).toBeInTheDocument();
    expect(screen.queryByLabelText('현재 grid active 전체 선택')).not.toBeInTheDocument();
  });
});

import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {Dashboard} from './Dashboard';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Dashboard', () => {
  it('labels the current grid selection checkbox as all select', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({profiles: []}), {status: 200}),
    );

    render(<Dashboard authorName="Aiden" />);

    expect(screen.getByLabelText('전체 선택')).toBeInTheDocument();
    expect(screen.queryByLabelText('현재 grid active 전체 선택')).not.toBeInTheDocument();
  });

  it('opens multi registration on a mobile viewport', async () => {
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 390});
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        return new Response(JSON.stringify(url.includes('/api/matches') ? {matches: []} : {profiles: []}));
      }),
    );

    render(<Dashboard authorName="테스트" />);
    fireEvent.click(screen.getByRole('button', {name: '매물 추가'}));

    expect(await screen.findByRole('dialog', {name: '여러 명 매물 등록'})).toBeInTheDocument();
  });
});

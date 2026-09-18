import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ProfileFormModal} from './ProfileFormModal';

afterEach(() => vi.unstubAllGlobals());

async function parse() {
  render(<ProfileFormModal mode={{kind: 'create'}} authorName="테스트" onClose={vi.fn()} onCreate={vi.fn()} onUpdate={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', {name: 'AI 자동입력'}));
  fireEvent.change(screen.getByPlaceholderText(/나이: 96년생/), {target: {value: '30세 교사'}});
  fireEvent.click(screen.getByRole('button', {name: '폼 채우기'}));
}

describe('AI profile form', () => {
  it('shows uncertain fields for review after filling the form', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({parsed: {job: '교사'}, warnings: ['출생연도를 직접 확인해 주세요.']}))));
    await parse();
    expect(await screen.findByText('출생연도를 직접 확인해 주세요.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('교사')).toBeInTheDocument();
  });
  it('keeps input available after network failure and shows a retry message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await parse();
    expect(await screen.findByText('네트워크 연결을 확인하고 다시 시도해 주세요.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30세 교사')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', {name: '폼 채우기'})).toBeEnabled());
  });
});

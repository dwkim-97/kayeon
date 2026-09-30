import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {useState} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import type {BatchCreateResult} from '@/lib/profiles/batch-create';

import {BatchProfileFormModal} from './BatchProfileFormModal';

vi.mock('@/lib/profiles/image-resize', () => ({
  resizeImageFile: vi.fn().mockResolvedValue({ok: true, dataUrl: 'data:image/jpeg;base64,cGhvdG8='}),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BatchProfileFormModal', () => {
  it('keeps each person form isolated while switching drafts', () => {
    render(
      <BatchProfileFormModal
        authorName="테스트"
        onClose={vi.fn()}
        onCreateMany={vi.fn().mockResolvedValue({created: [], failures: []})}
      />,
    );

    fireEvent.change(screen.getByLabelText(/사는 곳/), {target: {value: '서울 강남'}});
    fireEvent.click(screen.getByRole('button', {name: '사람 추가'}));

    expect(screen.getByText('2 / 10명')).toBeInTheDocument();
    expect(screen.getByLabelText(/사는 곳/)).toHaveValue('');

    fireEvent.click(screen.getByRole('button', {name: /1번 매물 편집/}));
    expect(screen.getByLabelText(/사는 곳/)).toHaveValue('서울 강남');
  });

  it('asks before closing drafts that contain work', () => {
    const onClose = vi.fn();
    render(
      <BatchProfileFormModal
        authorName="테스트"
        onClose={onClose}
        onCreateMany={vi.fn().mockResolvedValue({created: [], failures: []})}
      />,
    );

    fireEvent.change(screen.getByLabelText(/사는 곳/), {target: {value: '서울 강남'}});
    fireEvent.click(screen.getByRole('button', {name: '닫기'}));

    expect(screen.getByText('작성 중인 내용을 닫을까요?')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('restores page scrolling after confirming close', () => {
    function TestHost() {
      const [open, setOpen] = useState(true);

      return open ? (
        <BatchProfileFormModal
          authorName="테스트"
          onClose={() => setOpen(false)}
          onCreateMany={vi.fn().mockResolvedValue({created: [], failures: []})}
        />
      ) : null;
    }

    render(<TestHost />);
    fireEvent.change(screen.getByLabelText(/사는 곳/), {target: {value: '서울 강남'}});
    fireEvent.click(screen.getByRole('button', {name: '닫기'}));

    const confirmDialog = screen.getByRole('alertdialog');
    fireEvent.click(within(confirmDialog).getByRole('button', {name: '닫기'}));

    expect(document.body.style.overflow).toBe('');
  });

  it('keeps an unparsed introduction with its draft', () => {
    render(
      <BatchProfileFormModal
        authorName="테스트"
        onClose={vi.fn()}
        onCreateMany={vi.fn().mockResolvedValue({created: [], failures: []})}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'AI 자동입력'}));
    fireEvent.change(screen.getByPlaceholderText(/나이: 96년생/), {target: {value: '첫 번째 사람 소개'}});
    fireEvent.click(screen.getByRole('button', {name: '사람 추가'}));
    fireEvent.click(screen.getByRole('button', {name: /1번 매물 편집/}));

    expect(screen.getByDisplayValue('첫 번째 사람 소개')).toBeInTheDocument();
  });

  it('keeps async updates to an incomplete draft while another draft is being registered', async () => {
    let resolveParse!: (response: Response) => void;
    let resolveCreateMany!: (result: BatchCreateResult) => void;
    const parsePromise = new Promise<Response>(resolve => {
      resolveParse = resolve;
    });
    const createManyPromise = new Promise<BatchCreateResult>(resolve => {
      resolveCreateMany = resolve;
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(parsePromise));
    const onCreateMany = vi.fn().mockReturnValue(createManyPromise);

    render(<BatchProfileFormModal authorName="테스트" onClose={vi.fn()} onCreateMany={onCreateMany} />);
    fireEvent.change(screen.getByLabelText(/사는 곳/), {target: {value: '서울 강남'}});
    fireEvent.change(screen.getByLabelText(/키/), {target: {value: '165'}});
    fireEvent.change(screen.getByLabelText(/회사명/), {target: {value: '카카오'}});
    fireEvent.change(screen.getByLabelText(/사진 업로드/), {
      target: {files: [new File(['photo'], 'photo.jpeg', {type: 'image/jpeg'})]},
    });
    await screen.findByRole('button', {name: '사진 삭제'});

    fireEvent.click(screen.getByRole('button', {name: '사람 추가'}));
    fireEvent.click(screen.getByRole('button', {name: 'AI 자동입력'}));
    fireEvent.change(screen.getByPlaceholderText(/나이: 96년생/), {target: {value: '부산에 사는 두 번째 사람'}});
    fireEvent.click(screen.getByRole('button', {name: '폼 채우기'}));
    fireEvent.click(screen.getByRole('button', {name: '준비된 1명 등록하기'}));

    await act(async () => {
      resolveParse(
        new Response(JSON.stringify({parsed: {residence: '부산'}, warnings: ['나머지 필드를 확인해 주세요.']})),
      );
    });
    await waitFor(() => expect(screen.getByLabelText(/사는 곳/)).toHaveValue('부산'));

    const submittedProfiles = onCreateMany.mock.calls[0][0];
    await act(async () => {
      resolveCreateMany({created: submittedProfiles, failures: []});
    });

    await waitFor(() => expect(screen.getByLabelText(/사는 곳/)).toHaveValue('부산'));
    expect(screen.getByText('자동입력 후 확인이 필요합니다')).toBeInTheDocument();
  });
});

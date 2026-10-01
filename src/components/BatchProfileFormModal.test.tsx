import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {useState} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import type {BatchCreateProgress, BatchCreateResult} from '@/lib/profiles/batch-create';
import {resizeImageFile, type ResizeResult} from '@/lib/profiles/image-resize';
import type {Profile} from '@/types/profile';

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

    expect(screen.getByText('2명')).toBeInTheDocument();
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

    expect(screen.getByLabelText(/사는 곳/)).not.toBeDisabled();

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

  it('shows the first photo thumbnail and completed count while registering', async () => {
    let submittedProfiles: Profile[] = [];
    let reportProgress!: (progress: BatchCreateProgress) => void;
    let resolveCreateMany!: (result: BatchCreateResult) => void;
    const createManyPromise = new Promise<BatchCreateResult>(resolve => {
      resolveCreateMany = resolve;
    });
    const onCreateMany = vi.fn(
      (profiles: Profile[], onProgress: (progress: BatchCreateProgress) => void) => {
        submittedProfiles = profiles;
        reportProgress = onProgress;
        return createManyPromise;
      },
    );

    render(<BatchProfileFormModal authorName="테스트" onClose={vi.fn()} onCreateMany={onCreateMany} />);
    fireEvent.change(screen.getByLabelText(/사는 곳/), {target: {value: '서울 강남'}});
    fireEvent.change(screen.getByLabelText(/키/), {target: {value: '165'}});
    fireEvent.change(screen.getByLabelText(/회사명/), {target: {value: '카카오'}});
    fireEvent.change(screen.getByLabelText(/사진 업로드/), {
      target: {files: [new File(['first'], 'first.jpeg', {type: 'image/jpeg'})]},
    });
    await screen.findByRole('img', {name: '1번 대표 사진'});

    fireEvent.click(screen.getByRole('button', {name: '사람 추가'}));
    fireEvent.change(screen.getByLabelText(/사는 곳/), {target: {value: '부산 해운대'}});
    fireEvent.change(screen.getByLabelText(/키/), {target: {value: '170'}});
    fireEvent.change(screen.getByLabelText(/회사명/), {target: {value: '회사'}});
    fireEvent.change(screen.getByLabelText(/사진 업로드/), {
      target: {files: [new File(['second'], 'second.jpeg', {type: 'image/jpeg'})]},
    });
    await waitFor(() => expect(screen.getAllByRole('img', {name: /대표 사진/})).toHaveLength(2));

    fireEvent.click(screen.getByRole('button', {name: '준비된 2명 등록하기'}));
    act(() => {
      reportProgress({
        phase: 'started',
        profile: submittedProfiles[0],
        completedCount: 0,
        totalCount: 2,
      });
      reportProgress({
        phase: 'created',
        profile: submittedProfiles[0],
        completedCount: 1,
        totalCount: 2,
      });
    });

    const progress = screen.getByRole('progressbar', {name: '매물 등록 진행률'});
    expect(progress).toHaveAttribute('aria-valuenow', '1');
    expect(progress).toHaveAttribute('aria-valuemax', '2');
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByLabelText('1번 매물 등록 완료')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /1번 매물 편집, 등록 완료/})).toBeInTheDocument();

    await act(async () => {
      resolveCreateMany({created: submittedProfiles, failures: []});
    });
  });

  it('keeps failed status visible and lets the failed draft be edited after registration', async () => {
    let submittedProfile!: Profile;
    let reportProgress!: (progress: BatchCreateProgress) => void;
    const onCreateMany = vi.fn(
      async (profiles: Profile[], onProgress: (progress: BatchCreateProgress) => void) => {
        [submittedProfile] = profiles;
        reportProgress = onProgress;
        reportProgress({phase: 'started', profile: submittedProfile, completedCount: 0, totalCount: 1});
        await Promise.resolve();
        reportProgress({
          phase: 'failed',
          profile: submittedProfile,
          message: '등록 실패',
          completedCount: 1,
          totalCount: 1,
        });
        return {created: [], failures: [{profile: submittedProfile, message: '등록 실패'}]};
      },
    );

    render(<BatchProfileFormModal authorName="테스트" onClose={vi.fn()} onCreateMany={onCreateMany} />);
    fireEvent.change(screen.getByLabelText(/사는 곳/), {target: {value: '서울 강남'}});
    fireEvent.change(screen.getByLabelText(/키/), {target: {value: '165'}});
    fireEvent.change(screen.getByLabelText(/회사명/), {target: {value: '카카오'}});
    fireEvent.change(screen.getByLabelText(/사진 업로드/), {
      target: {files: [new File(['photo'], 'photo.jpeg', {type: 'image/jpeg'})]},
    });
    await screen.findByRole('img', {name: '1번 대표 사진'});

    fireEvent.click(screen.getByRole('button', {name: '준비된 1명 등록하기'}));
    expect(screen.getByLabelText(/사는 곳/)).toBeDisabled();

    await screen.findByText('1명을 등록하지 못했습니다.');
    expect(screen.getByLabelText('1번 매물 등록 실패')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /1번 매물 편집, 등록 실패/})).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', {name: '매물 등록 진행률'})).not.toBeInTheDocument();
    expect(screen.getByLabelText(/사는 곳/)).not.toBeDisabled();
  });

  it('ignores an image resize that finishes after its draft starts registering', async () => {
    let submittedProfiles: Profile[] = [];
    let resolveCreateMany!: (result: BatchCreateResult) => void;
    let resolveResize!: (result: ResizeResult) => void;
    const createManyPromise = new Promise<BatchCreateResult>(resolve => {
      resolveCreateMany = resolve;
    });
    const onCreateMany = vi.fn((profiles: Profile[]) => {
      submittedProfiles = profiles;
      return createManyPromise;
    });

    render(<BatchProfileFormModal authorName="테스트" onClose={vi.fn()} onCreateMany={onCreateMany} />);
    fireEvent.change(screen.getByLabelText(/사는 곳/), {target: {value: '서울 강남'}});
    fireEvent.change(screen.getByLabelText(/키/), {target: {value: '165'}});
    fireEvent.change(screen.getByLabelText(/회사명/), {target: {value: '카카오'}});
    fireEvent.change(screen.getByLabelText(/사진 업로드/), {
      target: {files: [new File(['first'], 'first.jpeg', {type: 'image/jpeg'})]},
    });
    await screen.findByRole('button', {name: '사진 삭제'});

    vi.mocked(resizeImageFile).mockReturnValueOnce(
      new Promise(resolve => {
        resolveResize = resolve;
      }),
    );
    fireEvent.change(screen.getByLabelText(/사진 업로드/), {
      target: {files: [new File(['second'], 'second.jpeg', {type: 'image/jpeg'})]},
    });
    fireEvent.click(screen.getByRole('button', {name: '준비된 1명 등록하기'}));
    expect(screen.getByLabelText(/사는 곳/)).toBeDisabled();

    await act(async () => {
      resolveResize({ok: true, dataUrl: 'data:image/jpeg;base64,c2Vjb25k', mimeType: 'image/jpeg'});
    });
    expect(screen.getAllByRole('button', {name: '사진 삭제'})).toHaveLength(1);

    await act(async () => {
      resolveCreateMany({created: submittedProfiles, failures: []});
    });
  });
});

import {render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {ProfileCard} from './ProfileCard';
import type {Profile} from '@/types/profile';

const profile: Profile = {
  id: 'profile-1',
  gender: 'female',
  status: 'active',
  isActivated: true,
  authorName: 'Aiden',
  starredByName: null,
  residence: '서울 강남구',
  birthYear: 1998,
  height: 164,
  job: 'IBK / 을지로 / 금융',
  religion: 'not_selected',
  mbti: 'ENFJ',
  hobbies: '독서',
  smoking: 'non_smoker',
  drinking: 'drinker',
  idealType: '다정한 사람',
  matchmakerComment: '성실함',
  extra: '',
  adminMemo: '',
  probe: 'not_selected',
  rejectionTolerance: 'not_selected',
  responseSpeed: 'not_selected',
  photos: [
    {id: 'photo-1', url: '/sample.jpg', alt: '프로필 사진 1', order: 0},
    {id: 'photo-2', url: '/sample-2.jpg', alt: '프로필 사진 2', order: 1},
  ],
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
};

const defaultProps = {
  profile,
  authorName: 'Aiden',
  isSelected: false,
  isEditMode: false,
  onSelectChange: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onStatusChange: vi.fn(),
  onToggleStar: vi.fn(),
  onOpenDetail: vi.fn(),
};

describe('ProfileCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('overlays birthYear/height and residence·job on the photo in the detailed variant', () => {
    render(<ProfileCard {...defaultProps} variant="detailed" />);

    // 사진 위 오버레이: "98년생 / 164cm" 와 "서울 강남구 거주 · ..."
    expect(screen.getByText('98년생 / 164cm')).toBeInTheDocument();
    expect(screen.getByText(/서울 강남구 거주/)).toBeInTheDocument();
    // 라벨식 정보표는 더 이상 없음
    expect(screen.queryByText('나이')).not.toBeInTheDocument();
    expect(screen.queryByText('사는 곳')).not.toBeInTheDocument();
  });

  it('uses activation data to disable deactivated profile selection', () => {
    render(
      <ProfileCard
        {...defaultProps}
        profile={{...profile, isActivated: false, status: 'blocked'}}
      />,
    );

    expect(screen.getByLabelText('98년생 매물 선택')).toBeDisabled();
  });

  it('does not show secondary info (MBTI) on the detailed card', () => {
    render(<ProfileCard {...defaultProps} variant="detailed" />);

    // 부가 정보는 카드에 없음 — 상세 모달에서만 확인
    expect(screen.queryByText('MBTI')).not.toBeInTheDocument();
    // 오버레이 핵심 정보는 존재
    expect(screen.getByText('98년생 / 164cm')).toBeInTheDocument();
  });

  it('summarizes the compact variant as a single slash-separated line', () => {
    render(<ProfileCard {...defaultProps} variant="compact" />);

    // birthYear / height / residence / job joined on one line, no separate labels
    expect(
      screen.getByText(/98년생 \/ 164cm \/ 서울 강남구 \/ IBK \/ 을지로 \/ 금융/),
    ).toBeInTheDocument();
    expect(screen.queryByText('나이')).not.toBeInTheDocument();
    expect(screen.queryByText('사는 곳')).not.toBeInTheDocument();

    // secondary info is dropped to keep the card compact
    expect(screen.queryByText('MBTI')).not.toBeInTheDocument();

    // 선택 체크박스는 조회 모드에서도 유지
    expect(screen.getByLabelText('98년생 매물 선택')).toBeInTheDocument();
  });

  it('hides edit/delete/status controls when not in edit mode', () => {
    render(<ProfileCard {...defaultProps} isEditMode={false} />);

    // 조회 모드: 관리 버튼 숨김
    expect(screen.queryByLabelText('98년생 매물 수정')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('98년생 매물 삭제')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('98년생 매물 비활성화')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('98년생 매물 활성화')).not.toBeInTheDocument();

    // 조회 모드에서도 유지되는 것: 선택 체크박스
    expect(screen.getByLabelText('98년생 매물 선택')).toBeInTheDocument();
  });

  it('shows edit/delete/deactivate controls in edit mode', () => {
    render(<ProfileCard {...defaultProps} isEditMode />);

    expect(screen.getByLabelText('98년생 매물 수정')).toBeInTheDocument();
    expect(screen.getByLabelText('98년생 매물 삭제')).toBeInTheDocument();
    // active 프로필 → 상태 버튼은 '비활성화'
    expect(screen.getByLabelText('98년생 매물 비활성화')).toBeInTheDocument();
    expect(screen.queryByLabelText('98년생 매물 활성화')).not.toBeInTheDocument();
  });

  it('labels the status button 활성화 for a blocked profile in edit mode', () => {
    render(
      <ProfileCard
        {...defaultProps}
        isEditMode
        profile={{...profile, isActivated: false, status: 'blocked'}}
      />,
    );

    expect(screen.getByLabelText('98년생 매물 활성화')).toBeInTheDocument();
    expect(screen.queryByLabelText('98년생 매물 비활성화')).not.toBeInTheDocument();
  });

  it('shows a match badge when there are ongoing matches', () => {
    render(<ProfileCard {...defaultProps} ongoingMatchCount={2} />);
    expect(screen.getByText(/매칭 2/)).toBeInTheDocument();
  });

  it('shows no match badge when count is zero', () => {
    render(<ProfileCard {...defaultProps} ongoingMatchCount={0} />);
    expect(screen.queryByText(/매칭/)).not.toBeInTheDocument();
  });

  it('shows a 집착매물 badge when the profile is starred', () => {
    render(<ProfileCard {...defaultProps} profile={{...profile, starredByName: '조이'}} />);
    expect(screen.getByText('집착매물')).toBeInTheDocument();
  });

  it('shows no 집착매물 badge when the profile is not starred', () => {
    render(<ProfileCard {...defaultProps} profile={{...profile, starredByName: null}} />);
    expect(screen.queryByText('집착매물')).not.toBeInTheDocument();
  });

  it('renders only the active photo, not every photo (avoids loading all images)', () => {
    const {container} = render(<ProfileCard {...defaultProps} variant="detailed" />);
    // 사진이 2장이어도 카드 이미지 영역에는 현재 사진 1장만 존재
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBe(1);
  });

  it('lazy-loads the card image via a render/image thumbnail URL', () => {
    const withStorageUrl: Profile = {
      ...profile,
      photos: [
        {
          id: 'photo-1',
          url: 'https://proj.supabase.co/storage/v1/object/public/profile-photos/a/b.png',
          alt: '프로필 사진 1',
          order: 0,
        },
      ],
    };
    const {container} = render(
      <ProfileCard {...defaultProps} profile={withStorageUrl} variant="detailed" />,
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('src')).toContain('/render/image/public/');
    // 비율 유지 축소(resize=contain)로 요청 — 잘림/찌그러짐 방지
    expect(img.getAttribute('src')).toContain('resize=contain');
    expect(img.getAttribute('src')).toContain('width=650');
  });
});

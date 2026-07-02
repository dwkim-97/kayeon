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
  onSelectChange: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onStatusChange: vi.fn(),
  onToggleStar: vi.fn(),
};

describe('ProfileCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows age, height, and residence as regular information rows without a visible gender label', () => {
    render(<ProfileCard {...defaultProps} />);

    expect(screen.queryByText('여성 29세')).not.toBeInTheDocument();
    expect(screen.getByText('나이')).toBeInTheDocument();
    expect(screen.getByText('98년생')).toBeInTheDocument();
    expect(screen.getByText('키')).toBeInTheDocument();
    expect(screen.getByText('164cm')).toBeInTheDocument();
    expect(screen.getByText('사는 곳')).toBeInTheDocument();
    expect(screen.getByText('서울 강남구')).toBeInTheDocument();
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

  it('renders all information rows in the detailed variant', () => {
    render(<ProfileCard {...defaultProps} variant="detailed" />);

    // detailed shows secondary rows such as MBTI in addition to the core rows
    expect(screen.getByText('MBTI')).toBeInTheDocument();
    expect(screen.getByText('ENFJ')).toBeInTheDocument();
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

    // interactive controls are still present in compact mode
    expect(screen.getByLabelText('98년생 매물 선택')).toBeInTheDocument();
    expect(screen.getByLabelText('98년생 매물 수정')).toBeInTheDocument();
    expect(screen.getByLabelText('98년생 매물 삭제')).toBeInTheDocument();
  });
});

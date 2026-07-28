import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {ProfileDetailModal} from './ProfileDetailModal';
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
  reward: '',
  manualOrderWeight: 0,
  photos: [{id: 'photo-1', url: '/sample.jpg', alt: '프로필 사진 1', order: 0}],
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
};

const baseProps = {
  profile,
  matches: [],
  allProfiles: [profile],
  onCreateMatch: () => {},
  onEndMatch: () => {},
  onDeleteMatch: () => {},
  onOpenProfile: () => {},
  onStatusChange: () => {},
  onEdit: () => {},
};

const malePartner: Profile = {
  ...profile,
  id: 'profile-2',
  gender: 'male',
  residence: '경기 판교',
  birthYear: 1999,
  height: 181,
  job: '카카오 / 판교 / IT',
  mbti: 'ENTJ',
  photos: [{id: 'photo-2', url: '/male.jpg', alt: '남성 프로필 사진 1', order: 0}],
};

const otherMalePartner: Profile = {
  ...profile,
  id: 'profile-3',
  gender: 'male',
  residence: '서울 잠실',
  birthYear: 1996,
  height: 176,
  job: '하나은행 / 을지로 / 금융',
  mbti: 'ISFP',
  photos: [{id: 'photo-3', url: '/other-male.jpg', alt: '남성 프로필 사진 2', order: 0}],
};

describe('ProfileDetailModal', () => {
  beforeEach(() => {
    // jsdom의 history를 초기 상태로
    window.history.replaceState(null, '');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 회귀 방지: 부모(Dashboard)가 매 렌더마다 새 인라인 onClose를 넘긴다.
  // 예전엔 history effect가 [onClose] 의존이라 리렌더 시 cleanup의 history.back()이
  // popstate→onClose를 유발해 모달이 즉시 닫혔다(@dnd-kit 도입 후 드러난 버그).
  // onClose를 새 참조로 바꿔 리렌더해도 onClose가 호출되면 안 된다.
  it('does not call onClose when re-rendered with a new onClose reference', () => {
    const backSpy = vi.spyOn(window.history, 'back');
    let closeCount = 0;

    const {rerender} = render(
      <ProfileDetailModal {...baseProps} onClose={() => {
        closeCount += 1;
      }} />,
    );

    // 부모 리렌더 시뮬레이션: 매번 새로운 onClose 함수 참조
    rerender(
      <ProfileDetailModal {...baseProps} onClose={() => {
        closeCount += 1;
      }} />,
    );
    rerender(
      <ProfileDetailModal {...baseProps} onClose={() => {
        closeCount += 1;
      }} />,
    );

    expect(closeCount).toBe(0);
    // 열려 있는 동안에는 history.back()이 호출되면 안 된다(닫기 트리거 방지).
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('calls the latest onClose on popstate (phone back)', () => {
    let closedWith = 0;
    const {rerender} = render(<ProfileDetailModal {...baseProps} onClose={() => { closedWith = 1; }} />);
    // 최신 onClose로 교체 후에도 popstate가 최신 핸들러를 호출해야 한다
    rerender(<ProfileDetailModal {...baseProps} onClose={() => { closedWith = 2; }} />);

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(closedWith).toBe(2);
  });

  it('shows a fixed close button', () => {
    render(<ProfileDetailModal {...baseProps} onClose={() => {}} />);

    expect(screen.getByLabelText('닫기')).toHaveClass('fixed');
  });

  it('calls onStatusChange from the detail page status button', async () => {
    const user = userEvent.setup();
    const handleStatusChange = vi.fn();

    render(<ProfileDetailModal {...baseProps} onStatusChange={handleStatusChange} onClose={() => {}} />);

    await user.click(screen.getByRole('button', {name: '98년생 매물 비활성화'}));

    expect(handleStatusChange).toHaveBeenCalledWith('profile-1', 'blocked');
  });

  it('opens a fixed match dialog and creates checked matches', async () => {
    const user = userEvent.setup();
    const handleCreateMatch = vi.fn();

    render(
      <ProfileDetailModal
        {...baseProps}
        allProfiles={[profile, malePartner, otherMalePartner]}
        onCreateMatch={handleCreateMatch}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', {name: '+ 매칭 추가'}));
    expect(screen.getByRole('dialog', {name: '매칭 추가'})).toHaveClass('fixed');

    await user.type(screen.getByRole('searchbox', {name: '매칭 후보 검색'}), '카카오 판교');

    expect(screen.getByText('99년생 · 경기 판교')).toBeInTheDocument();
    expect(screen.queryByText('96년생 · 서울 잠실')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', {name: '99년생 매칭 선택'}));
    await user.click(screen.getByRole('button', {name: '선택한 매칭 추가 (1)'}));

    expect(handleCreateMatch).toHaveBeenCalledWith('profile-1', 'profile-2');
  });
});

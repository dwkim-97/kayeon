import {render} from '@testing-library/react';
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
  onEdit: () => {},
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
});

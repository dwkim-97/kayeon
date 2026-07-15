import {StrictMode} from 'react';
import {render, act} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';

import {ProfileDetailModal} from './ProfileDetailModal';
import type {Profile} from '@/types/profile';

const profile: Profile = {
  id: 'p1', gender: 'female', status: 'active', isActivated: true, authorName: 'A', starredByName: null,
  residence: '서울', birthYear: 1998, height: 164, job: 'IT', religion: 'not_selected', mbti: '', hobbies: '',
  smoking: 'not_selected', drinking: 'not_selected', idealType: '', matchmakerComment: '', extra: '', adminMemo: '',
  probe: 'not_selected', rejectionTolerance: 'not_selected', responseSpeed: 'not_selected', reward: '', manualOrderWeight: 0,
  photos: [{id: 'ph1', url: '/s.jpg', alt: 'a', order: 0}], createdAt: '2026-06-30T00:00:00.000Z', updatedAt: '2026-06-30T00:00:00.000Z',
};
const props = {profile, matches: [], allProfiles: [profile], onCreateMatch() {}, onEndMatch() {}, onDeleteMatch() {}, onOpenProfile() {}, onEdit() {}};

// jsdom은 history.back()에서 popstate를 쏘지 않는다. 실제 브라우저처럼
// back() 호출 시 이전 state로 되돌리고 popstate를 "비동기"로 발생시키도록 스텁한다.
// 이 비동기 popstate가 StrictMode 재-setup 이후 도착하는 것이 버그의 핵심이다.
function installBrowserLikeHistoryBack() {
  const orig = window.history.back;
  window.history.back = () => {
    window.history.replaceState(null, '');
    setTimeout(() => window.dispatchEvent(new PopStateEvent('popstate', {state: null})), 0);
  };
  return () => {
    window.history.back = orig;
  };
}

describe('ProfileDetailModal under StrictMode (browser-like back)', () => {
  let restore: () => void;
  beforeEach(() => {
    window.history.replaceState(null, '');
    restore = installBrowserLikeHistoryBack();
  });
  afterEach(() => {
    restore();
    vi.restoreAllMocks();
  });

  // 회귀 방지(진짜 원인): StrictMode 이중 마운트로 cleanup의 back()이 비동기 popstate를
  // 발생시키고, 그게 재-setup된 리스너에 잡혀 onClose가 불려 모달이 바로 닫히던 버그.
  it('does not close itself right after opening (StrictMode double-mount)', async () => {
    let closes = 0;
    await act(async () => {
      render(<StrictMode><ProfileDetailModal {...props} onClose={() => { closes += 1; }} /></StrictMode>);
    });
    await act(async () => { await new Promise(r => setTimeout(r, 30)); });
    expect(closes).toBe(0);
  });

  // 정상 동작 유지: 마운트가 안정된 뒤 진짜 뒤로가기(popstate)는 모달을 닫아야 한다.
  it('still closes on a genuine back/popstate after mount settles', async () => {
    let closes = 0;
    await act(async () => {
      render(<StrictMode><ProfileDetailModal {...props} onClose={() => { closes += 1; }} /></StrictMode>);
    });
    await act(async () => { await new Promise(r => setTimeout(r, 30)); });
    expect(closes).toBe(0); // 아직 안 닫힘

    // 사용자가 실제로 뒤로가기 → 모달만 닫힘
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', {state: null}));
    });
    expect(closes).toBe(1);
  });
});

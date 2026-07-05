import {fireEvent, render, screen, within} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

vi.mock('@/lib/auth/logout', () => ({logout: vi.fn()}));
vi.mock('next/image', () => ({
  default: (props: {alt?: string}) => <span data-testid="logo">{props.alt}</span>,
}));

import {AppHeader} from './AppHeader';

describe('AppHeader mobile drawer', () => {
  it('portals the drawer out of a backdrop-filtered ancestor (dashboard case)', () => {
    // Reproduces the dashboard wrapper: a backdrop-blur ancestor that would
    // otherwise become the containing block for the drawer's `fixed` layers.
    const wrapper = document.createElement('div');
    wrapper.className = 'sticky top-0 z-40 backdrop-blur';
    document.body.appendChild(wrapper);

    render(<AppHeader page="dashboard" sticky={false} />, {container: wrapper});

    // Open the drawer.
    fireEvent.click(screen.getByLabelText('메뉴 열기'));

    const dialog = screen.getByRole('dialog');

    // The drawer must NOT live inside the backdrop-filtered wrapper — otherwise
    // its `fixed` positioning is clipped to the header bar (the reported bug).
    expect(wrapper.contains(dialog)).toBe(false);

    // It should be portaled directly under <body>.
    expect(dialog.closest('.backdrop-blur')).toBeNull();

    // And it still carries the full nav + logout, in order.
    const labels = within(dialog)
      .getAllByRole('link')
      .map(el => el.textContent?.trim());
    expect(labels).toEqual(['대기 매물', '히스토리', '관리자']);
    expect(within(dialog).getByText('로그아웃')).toBeTruthy();
  });

  it('shows the signed-in matchmaker name when authorName is provided', () => {
    render(<AppHeader page="dashboard" authorName="에이든" />);
    // 데스크톱 칩 + 드로어 라벨 어딘가에 이름이 노출된다.
    expect(screen.getAllByText('에이든').length).toBeGreaterThan(0);
    expect(screen.getAllByText('접속 계정').length).toBeGreaterThan(0);
  });

  it('omits the account chip when no authorName is given', () => {
    render(<AppHeader page="history" />);
    expect(screen.queryByText('접속 계정')).toBeNull();
  });
});

import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import LoginPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('LoginPage', () => {
  it('does not show id or password placeholders', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('아이디')).not.toHaveAttribute('placeholder');
    expect(screen.getByLabelText('비밀번호')).not.toHaveAttribute('placeholder');
  });
});

import {render, screen} from '@testing-library/react';
import {renderToString} from 'react-dom/server';
import {afterEach, describe, expect, it} from 'vitest';

import {Dashboard} from './Dashboard';

const storageKey = 'kayeon_profiles_v1';

describe('Dashboard', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('labels the current grid selection checkbox as all select', () => {
    render(<Dashboard />);

    expect(screen.getByLabelText('전체 선택')).toBeInTheDocument();
    expect(screen.queryByLabelText('현재 grid active 전체 선택')).not.toBeInTheDocument();
  });

  it('does not read local storage while producing the initial render snapshot', () => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify([
        {
          id: 'stored-profile',
          gender: 'female',
          status: 'active',
          isActivated: true,
          authorName: 'Aiden',
          residence: '서울 강남구',
          birthYear: 1998,
          height: 164,
          job: 'IBK / 을지로 / 금융',
          religion: 'none',
          mbti: 'ENFJ',
          hobbies: '독서',
          smoking: 'non_smoker',
          drinking: 'drinker',
          idealType: '다정한 사람',
          matchmakerComment: '성실함',
          extra: '',
          photos: [
            {
              id: 'stored-photo',
              url: '/stored.jpg',
              alt: '서연 프로필 사진 1',
              order: 0,
            },
          ],
          createdAt: '2026-06-30T00:00:00.000Z',
          updatedAt: '2026-06-30T00:00:00.000Z',
        },
      ]),
    );

    const html = renderToString(<Dashboard />);

    expect(html).toContain('alt="프로필 사진 1"');
    expect(html).not.toContain('서연 프로필 사진 1');
  });
});

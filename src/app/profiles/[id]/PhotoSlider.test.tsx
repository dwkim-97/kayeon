import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
afterEach(() => vi.unstubAllEnvs());

import {PhotoSlider} from './PhotoSlider';
import type {ProfilePhoto} from '@/types/profile';

const photos: ProfilePhoto[] = [
  {id: 'p1', url: '/a.jpg', alt: '사진 1', order: 0},
  {id: 'p2', url: '/b.jpg', alt: '사진 2', order: 1},
  {id: 'p3', url: '/c.jpg', alt: '사진 3', order: 2},
];

// 현재 보이는 사진 = opacity가 1인 img
function visibleAlt(container: HTMLElement): string | null {
  const imgs = Array.from(container.querySelectorAll('img'));
  const shown = imgs.find(img => img.style.opacity === '1');
  return shown?.getAttribute('alt') ?? null;
}

function swipe(container: HTMLElement, fromX: number, toX: number, y = 100) {
  const slider = container.firstElementChild as HTMLElement;
  fireEvent.touchStart(slider, {changedTouches: [{clientX: fromX, clientY: y}]});
  fireEvent.touchEnd(slider, {changedTouches: [{clientX: toX, clientY: y}]});
}

describe('PhotoSlider swipe', () => {
  it('advances to the next photo on left swipe', () => {
    const {container} = render(<PhotoSlider photos={photos} infoRows={[]} />);
    expect(visibleAlt(container)).toBe('사진 1');
    swipe(container, 200, 120); // 왼쪽으로 80px
    expect(visibleAlt(container)).toBe('사진 2');
  });

  it('goes to the previous photo on right swipe (wraps around)', () => {
    const {container} = render(<PhotoSlider photos={photos} infoRows={[]} />);
    swipe(container, 120, 220); // 오른쪽으로 100px → 마지막으로 순환
    expect(visibleAlt(container)).toBe('사진 3');
  });

  it('ignores a small horizontal movement below the threshold', () => {
    const {container} = render(<PhotoSlider photos={photos} infoRows={[]} />);
    swipe(container, 200, 180); // 20px만 이동
    expect(visibleAlt(container)).toBe('사진 1');
  });

  it('ignores a mostly-vertical swipe (page scroll)', () => {
    const {container} = render(<PhotoSlider photos={photos} infoRows={[]} />);
    const slider = container.firstElementChild as HTMLElement;
    fireEvent.touchStart(slider, {changedTouches: [{clientX: 200, clientY: 100}]});
    fireEvent.touchEnd(slider, {changedTouches: [{clientX: 150, clientY: 300}]}); // dx 50, dy 200
    expect(visibleAlt(container)).toBe('사진 1');
  });

  it('does not swipe when there is only one photo', () => {
    const {container} = render(<PhotoSlider photos={[photos[0]]} infoRows={[]} />);
    swipe(container, 200, 100);
    expect(screen.getByAltText('사진 1')).toBeInTheDocument();
  });
  it('shows the cached thumbnail until the detail image loads', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
    const {container} = render(<PhotoSlider photos={[{...photos[0], url: 'https://proj.supabase.co/storage/v1/object/public/profile-photos/a/b.png'}]} infoRows={[]} />);
    const detail = screen.getByAltText('사진 1');
    const preview = container.querySelector('img[aria-hidden="true"]');
    expect(preview).toHaveAttribute('src', '/api/photos/thumbnail?path=a%2Fb.png&width=650');
    expect(detail).toHaveStyle({opacity: '0'});
    fireEvent.load(detail);
    expect(detail).toHaveStyle({opacity: '1'});
    expect(container.querySelector('img[aria-hidden="true"]')).toBeNull();
  });

});

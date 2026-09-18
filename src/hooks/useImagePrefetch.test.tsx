import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useImagePrefetch} from './useImagePrefetch';

let requested: FakeImage[];
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  fetchPriority = '';
  decoding = '';
  src = '';
  constructor() { requested.push(this); }
  decode() { return Promise.resolve(); }
  removeAttribute() { this.src = ''; }
}
beforeEach(() => {
  requested = [];
  vi.useFakeTimers();
  vi.stubGlobal('Image', FakeImage);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); document.body.innerHTML = ''; });
const advance = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(500); }); };
describe('background detail photos', () => {
  it('waits for visible thumbnails before prefetching and uses two low-priority requests', async () => {
    const thumbnail = document.createElement('img');
    thumbnail.dataset.profileThumbnail = '';
    Object.defineProperty(thumbnail, 'complete', {value: false});
    thumbnail.getBoundingClientRect = () => ({top: 0, left: 0, bottom: 200, right: 200, width: 200, height: 200, x: 0, y: 0, toJSON() {}});
    document.body.append(thumbnail);
    renderHook(() => useImagePrefetch(['/1', '/2', '/3'], true));
    await advance();
    expect(requested).toHaveLength(0);
    await act(async () => thumbnail.dispatchEvent(new Event('load')));
    await advance();
    expect(requested.map(i => i.src)).toEqual(['/1', '/2']);
    expect(requested.every(i => i.fetchPriority === 'low')).toBe(true);
    await act(async () => requested[0].onload?.());
    expect(requested.map(i => i.src)).toEqual(['/1', '/2', '/3']);
  });
  it('does not repeat completed URLs when the queue changes and cancels obsolete work', async () => {
    const {rerender, unmount} = renderHook(({urls}) => useImagePrefetch(urls, true), {initialProps: {urls: ['/1']}});
    await advance();
    await act(async () => requested[0].onload?.());
    rerender({urls: ['/1', '/2', '/3', '/4']});
    await advance();
    expect(requested.map(i => i.src)).toEqual(['/1', '/2', '/3']);
    unmount();
    await advance();
    expect(requested).toHaveLength(3);
    expect(requested.slice(1).every(i => i.src === '')).toBe(true);
  });
  it('advances after errors and retries failed URLs on a later queue', async () => {
    const {rerender} = renderHook(({urls}) => useImagePrefetch(urls, true), {initialProps: {urls: ['/bad']}});
    await advance();
    await act(async () => requested[0].onerror?.());
    rerender({urls: ['/bad', '/good']});
    await advance();
    expect(requested.map(i => i.src)).toEqual(['/bad', '/bad', '/good']);
  });
  it('does not wait for offscreen lazy thumbnails', async () => {
    const thumbnail = document.createElement('img');
    thumbnail.dataset.profileThumbnail = '';
    Object.defineProperty(thumbnail, 'complete', {value: false});
    thumbnail.getBoundingClientRect = () => ({top: 10000, left: 0, bottom: 10200, right: 200, width: 200, height: 200, x: 0, y: 10000, toJSON() {}});
    document.body.append(thumbnail);
    renderHook(() => useImagePrefetch(['/detail'], true));
    await advance();
    expect(requested.map(i => i.src)).toEqual(['/detail']);
  });
  it('releases a stalled image so the remaining queue is not blocked', async () => {
    renderHook(() => useImagePrefetch(['/stalled1', '/stalled2', '/next'], true));
    await advance();
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(requested.map(i => i.src)).toEqual(['', '', '/next']);
  });

});

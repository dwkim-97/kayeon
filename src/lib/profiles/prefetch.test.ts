import {describe, expect, it} from 'vitest';

import {collectDetailPhotoUrls} from './prefetch';
import type {Profile} from '@/types/profile';

function makeProfile(id: string, photoUrls: string[]): Profile {
  return {
    id,
    gender: 'female',
    status: 'active',
    isActivated: true,
    authorName: 'A',
    starredByName: null,
    residence: '서울',
    birthYear: 1995,
    height: 165,
    job: '회사',
    religion: 'not_selected',
    mbti: '',
    hobbies: '',
    smoking: 'not_selected',
    drinking: 'not_selected',
    idealType: '',
    matchmakerComment: '',
    extra: '',
    adminMemo: '',
    probe: 'not_selected',
    rejectionTolerance: 'not_selected',
    responseSpeed: 'not_selected',
    photos: photoUrls.map((url, order) => ({id: `${id}-${order}`, url, alt: '', order})),
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  };
}

const OBJECT = (name: string) =>
  `https://proj.supabase.co/storage/v1/object/public/profile-photos/${name}.png`;

describe('collectDetailPhotoUrls', () => {
  it('returns DETAIL-sized (1200) render URLs for every photo', () => {
    const urls = collectDetailPhotoUrls([makeProfile('p1', [OBJECT('a'), OBJECT('b')])]);
    expect(urls).toHaveLength(2);
    urls.forEach(u => {
      expect(u).toContain('/render/image/public/');
      expect(u).toContain('width=1200');
    });
  });

  it('dedupes identical URLs', () => {
    const urls = collectDetailPhotoUrls([
      makeProfile('p1', [OBJECT('same')]),
      makeProfile('p2', [OBJECT('same')]),
    ]);
    expect(urls).toHaveLength(1);
  });

  it('orders each profile primary photo (first) before the rest', () => {
    const urls = collectDetailPhotoUrls([
      makeProfile('p1', [OBJECT('p1-primary'), OBJECT('p1-second')]),
      makeProfile('p2', [OBJECT('p2-primary')]),
    ]);
    // 대표사진 두 개가 앞쪽에, 보조사진은 뒤쪽에
    expect(urls[0]).toContain('p1-primary');
    expect(urls[1]).toContain('p2-primary');
    expect(urls[2]).toContain('p1-second');
  });

  it('returns an empty array for no profiles / no photos', () => {
    expect(collectDetailPhotoUrls([])).toEqual([]);
    expect(collectDetailPhotoUrls([makeProfile('p1', [])])).toEqual([]);
  });
});

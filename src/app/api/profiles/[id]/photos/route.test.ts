// @vitest-environment node

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {DELETE} from './route';

const mocks = vi.hoisted(() => ({
  remove: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({createSupabaseAdminClient: vi.fn()}));
vi.mock('@/lib/supabase/server', () => ({
  PROFILE_PHOTOS_BUCKET: 'profile-photos',
  createSupabaseServerClient: mocks.createServerClient,
}));

const routeContext = {params: Promise.resolve({id: 'profile-1'})};

function deleteRequest(storagePaths: string[]) {
  return new Request('http://localhost/api/profiles/profile-1/photos', {
    method: 'DELETE',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({storagePaths}),
  });
}

describe('profile photo cleanup API', () => {
  beforeEach(() => {
    mocks.remove.mockReset().mockResolvedValue({error: null});
    mocks.createServerClient.mockReset().mockResolvedValue({
      storage: {from: () => ({remove: mocks.remove})},
    });
  });

  it('removes signed profile photos and their thumbnails', async () => {
    const response = await DELETE(deleteRequest(['profile-1/photo.jpeg']), routeContext);

    expect(response.status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith([
      'profile-1/photo.jpeg',
      '_thumbnails/v1/240/profile-1/photo.jpeg.webp',
      '_thumbnails/v1/650/profile-1/photo.jpeg.webp',
      '_thumbnails/v1/1200/profile-1/photo.jpeg.webp',
    ]);
  });

  it('rejects cleanup outside the profile folder', async () => {
    const response = await DELETE(deleteRequest(['another-profile/photo.jpeg']), routeContext);

    expect(response.status).toBe(400);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
});

export type ProfileCreateFlow = 'single' | 'batch';

const BATCH_PROFILE_MIN_VIEWPORT = 1280;

export function getProfileCreateFlow(viewportWidth: number): ProfileCreateFlow {
  return viewportWidth >= BATCH_PROFILE_MIN_VIEWPORT ? 'batch' : 'single';
}

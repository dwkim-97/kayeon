import type {Profile} from '@/types/profile';

export type BatchCreateFailure = {
  profile: Profile;
  message: string;
};

export type BatchCreateResult = {
  created: Profile[];
  failures: BatchCreateFailure[];
};

export type BatchCreateProgress =
  | {
      phase: 'started';
      profile: Profile;
      completedCount: number;
      totalCount: number;
    }
  | {
      phase: 'created';
      profile: Profile;
      completedCount: number;
      totalCount: number;
    }
  | {
      phase: 'failed';
      profile: Profile;
      message: string;
      completedCount: number;
      totalCount: number;
    };

const PROFILE_CREATE_BATCH_SIZE = 10;

export async function finalizeProfileCreation(
  profile: Profile,
  attachPhotos: (profile: Profile) => Promise<Profile>,
  rollback: (profileId: string) => Promise<void>,
): Promise<Profile> {
  try {
    return await attachPhotos(profile);
  } catch (error) {
    try {
      await rollback(profile.id);
    } catch (rollbackError) {
      const creationMessage = error instanceof Error ? error.message : String(error);
      const rollbackMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      throw new Error(`${creationMessage}\n생성된 매물 자동 정리도 실패했습니다: ${rollbackMessage}`);
    }
    throw error;
  }
}

export async function settleProfileCreations(
  profiles: Profile[],
  createProfile: (profile: Profile) => Promise<Profile>,
  onProgress: (progress: BatchCreateProgress) => void,
): Promise<BatchCreateResult> {
  const created: Profile[] = [];
  const failures: BatchCreateFailure[] = [];
  let completedCount = 0;

  for (let startIndex = 0; startIndex < profiles.length; startIndex += PROFILE_CREATE_BATCH_SIZE) {
    const batch = profiles.slice(startIndex, startIndex + PROFILE_CREATE_BATCH_SIZE);
    const outcomes = await Promise.all(
      batch.map(async profile => {
        onProgress({phase: 'started', profile, completedCount, totalCount: profiles.length});
        try {
          const createdProfile = await createProfile(profile);
          completedCount += 1;
          onProgress({phase: 'created', profile: createdProfile, completedCount, totalCount: profiles.length});
          return {kind: 'created' as const, profile: createdProfile};
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          completedCount += 1;
          onProgress({phase: 'failed', profile, message, completedCount, totalCount: profiles.length});
          return {kind: 'failed' as const, profile, message};
        }
      }),
    );

    for (const outcome of outcomes) {
      if (outcome.kind === 'created') {
        created.push(outcome.profile);
      } else {
        failures.push({profile: outcome.profile, message: outcome.message});
      }
    }
  }

  return {created, failures};
}

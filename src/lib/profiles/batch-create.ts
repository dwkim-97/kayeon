import type {Profile} from '@/types/profile';

export type BatchCreateFailure = {
  profile: Profile;
  message: string;
};

export type BatchCreateResult = {
  created: Profile[];
  failures: BatchCreateFailure[];
};

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
): Promise<BatchCreateResult> {
  const created: Profile[] = [];
  const failures: BatchCreateFailure[] = [];

  for (const profile of profiles) {
    try {
      created.push(await createProfile(profile));
    } catch (error) {
      failures.push({
        profile,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {created, failures};
}

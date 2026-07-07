import {z} from 'zod';

const schema = z.object({
  gender: z.enum(['female', 'male']),
  birthYear: z.number().int().min(1920).max(2020),
  height: z.number().int().min(120).max(230),
  residence: z.string().trim().min(1),
  job: z.string().trim().min(1),
  religion: z.enum(['christian', 'buddhist', 'catholic', 'none', 'not_selected']).default('not_selected'),
  mbti: z.string().trim().default(''),
  hobbies: z.string().trim().default(''),
  smoking: z.enum(['smoker', 'non_smoker', 'not_selected']).default('not_selected'),
  drinking: z.enum(['drinker', 'non_drinker', 'not_selected']).default('not_selected'),
  idealType: z.string().trim().default(''),
  matchmakerComment: z.string().trim().default(''),
  extra: z.string().trim().default(''),
});

export type ExternalProfileInput = z.infer<typeof schema>;

export type ParseResult =
  | {success: true; value: ExternalProfileInput}
  | {success: false; error: string};

export function parseExternalProfile(input: unknown): ParseResult {
  const result = schema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
    };
  }
  return {success: true, value: result.data};
}

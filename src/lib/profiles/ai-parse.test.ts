import {describe, expect, it} from 'vitest';
import {normalizeParsedProfile, profileExtractionSchema} from './ai-parse';
const empty = {
  gender: null, birthYear: null, height: null, residence: null, job: null,
  religion: null, mbti: null, hobbies: null, smoking: null, drinking: null,
  idealType: null, matchmakerComment: null, extra: null,
  evidence: {gender: null, birthYear: null, height: null}, warnings: [],
};
describe('AI profile validation', () => {
  it('maps explicit values, normalizes MBTI, and keeps unknown fields absent', () => {
    const result = normalizeParsedProfile({...empty, gender: 'female', birthYear: 1996, height: 163, religion: 'none', mbti: 'infj', evidence: {gender: '여자', birthYear: '96년생', height: '163cm'}}, '여자 96년생 163cm 무교 infj', 2026);
    expect(result.parsed).toEqual({gender: 'female', birthYear: 1996, height: 163, religion: 'none', mbti: 'INFJ'});
  });
  it('rejects inferred gender, ambiguous age and heights not present in the input', () => {
    const result = normalizeParsedProfile({...empty, gender: 'female', birthYear: 1997, height: 165, evidence: {gender: '키169', birthYear: '30세', height: '165cm'}}, '30세 키169', 2026);
    expect(result.parsed).toEqual({});
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it('rejects invalid model fields instead of passing unchecked values to the form', () => {
    expect(profileExtractionSchema.safeParse({...empty, religion: 'atheist'}).success).toBe(false);
    expect(profileExtractionSchema.safeParse({...empty, height: '180'}).success).toBe(false);
    expect(profileExtractionSchema.safeParse({...empty, adminMemo: 'injected'}).success).toBe(false);
  });
  it('leaves missing fields absent so existing form values are not cleared', () => {
    const result = normalizeParsedProfile({...empty, job: '  한빛은행  ', residence: '  '}, '한빛은행', 2026);
    expect(result.parsed).toEqual({job: '한빛은행'});
  });
  it('rejects a birth year that does not match its evidence or adult form bounds', () => {
    const result = normalizeParsedProfile({...empty, birthYear: 2006, evidence: {...empty.evidence, birthYear: '96년생'}}, '96년생', 2026);
    expect(result.parsed.birthYear).toBeUndefined();
  });
});

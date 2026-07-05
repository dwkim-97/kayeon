import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {isValidApiKey} from './api-key';

describe('isValidApiKey', () => {
  const original = process.env.EXTERNAL_API_KEY;
  beforeEach(() => {
    process.env.EXTERNAL_API_KEY = 'secret-123';
  });
  afterEach(() => {
    process.env.EXTERNAL_API_KEY = original;
  });

  it('returns true for matching key', () => {
    expect(isValidApiKey('secret-123')).toBe(true);
  });
  it('returns false for wrong key', () => {
    expect(isValidApiKey('nope')).toBe(false);
  });
  it('returns false for null', () => {
    expect(isValidApiKey(null)).toBe(false);
  });
  it('returns false when env is unset', () => {
    delete process.env.EXTERNAL_API_KEY;
    expect(isValidApiKey('secret-123')).toBe(false);
  });
});

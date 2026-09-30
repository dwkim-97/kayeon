import {describe, expect, it} from 'vitest';

import {getProfileCreateFlow} from './create-flow';

describe('profile create flow', () => {
  it('uses the single form below the desktop breakpoint', () => {
    expect(getProfileCreateFlow(1279)).toBe('single');
  });

  it('uses the batch form at the desktop breakpoint', () => {
    expect(getProfileCreateFlow(1280)).toBe('batch');
  });
});

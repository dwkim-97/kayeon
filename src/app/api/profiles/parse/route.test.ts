import {describe, expect, it} from 'vitest';

import {SYSTEM_PROMPT} from './route';

describe('profile parse prompt', () => {
  it('uses height as a fallback gender signal', () => {
    expect(SYSTEM_PROMPT).toContain('height >= 175');
    expect(SYSTEM_PROMPT).toContain('height <= 170');
  });

  it('keeps mapped fields out of extra', () => {
    expect(SYSTEM_PROMPT).toContain('Do not duplicate information in extra');
  });
});

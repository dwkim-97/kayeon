import {describe, expect, it} from 'vitest';

import {
  computeResizedDimensions,
  describeUnsupportedType,
  estimateDataUrlBytes,
  isAllowedImageType,
  MAX_IMAGE_DIMENSION,
} from './image-resize';

describe('computeResizedDimensions', () => {
  it('leaves small images unchanged', () => {
    expect(computeResizedDimensions(800, 600)).toEqual({width: 800, height: 600});
  });

  it('scales down a wide image so the longest side is the max dimension', () => {
    const {width, height} = computeResizedDimensions(3200, 1600);
    expect(width).toBe(MAX_IMAGE_DIMENSION);
    expect(height).toBe(MAX_IMAGE_DIMENSION / 2);
  });

  it('scales down a tall image by its height', () => {
    const {width, height} = computeResizedDimensions(1000, 4000);
    expect(height).toBe(MAX_IMAGE_DIMENSION);
    expect(width).toBe(Math.round(1000 * (MAX_IMAGE_DIMENSION / 4000)));
  });

  it('never scales below 1px and rounds to integers', () => {
    const {width, height} = computeResizedDimensions(10000, 3);
    expect(width).toBe(MAX_IMAGE_DIMENSION);
    expect(height).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(width)).toBe(true);
    expect(Number.isInteger(height)).toBe(true);
  });

  it('handles zero dimensions without dividing by zero', () => {
    expect(computeResizedDimensions(0, 0)).toEqual({width: 0, height: 0});
  });
});

describe('isAllowedImageType', () => {
  it('accepts jpeg/png/webp', () => {
    expect(isAllowedImageType('image/jpeg')).toBe(true);
    expect(isAllowedImageType('image/png')).toBe(true);
    expect(isAllowedImageType('image/webp')).toBe(true);
  });

  it('rejects heic and others', () => {
    expect(isAllowedImageType('image/heic')).toBe(false);
    expect(isAllowedImageType('image/gif')).toBe(false);
    expect(isAllowedImageType('')).toBe(false);
  });
});

describe('describeUnsupportedType', () => {
  it('returns null for allowed types', () => {
    expect(describeUnsupportedType('a.jpg', 'image/jpeg')).toBeNull();
  });

  it('gives a HEIC-specific hint for iPhone photos', () => {
    const msg = describeUnsupportedType('IMG_1234.HEIC', 'image/heic');
    expect(msg).toMatch(/HEIC/);
  });

  it('detects HEIC by file extension even when mime type is blank', () => {
    const msg = describeUnsupportedType('photo.heic', '');
    expect(msg).toMatch(/HEIC/);
  });

  it('gives a generic message for other unsupported types', () => {
    const msg = describeUnsupportedType('anim.gif', 'image/gif');
    expect(msg).toMatch(/JPG·PNG·WEBP/);
  });
});

describe('estimateDataUrlBytes', () => {
  it('estimates byte length from a base64 data URL', () => {
    // "AAAA" (4 base64 chars, no padding) -> 3 bytes
    expect(estimateDataUrlBytes('data:image/jpeg;base64,AAAA')).toBe(3);
  });

  it('accounts for padding', () => {
    // "AAA=" -> 2 bytes, "AA==" -> 1 byte
    expect(estimateDataUrlBytes('data:image/png;base64,AAA=')).toBe(2);
    expect(estimateDataUrlBytes('data:image/png;base64,AA==')).toBe(1);
  });
});

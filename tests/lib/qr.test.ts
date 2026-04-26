import { describe, expect, it } from 'vitest';
import { createQrMatrix } from '@/lib/qr';

describe('QR matrix generator', () => {
  it('creates a scannable-size square matrix for public profile URLs', () => {
    const matrix = createQrMatrix('http://localhost:3003/u/codex-copy-contact-test');

    expect(matrix.size).toBeGreaterThanOrEqual(21);
    expect(matrix.size).toBe(matrix.modules.length);
    expect(matrix.modules.every((row) => row.length === matrix.size)).toBe(true);
  });

  it('keeps the required finder pattern in the top-left corner', () => {
    const matrix = createQrMatrix('https://livelink.app/u/jun-agent');

    expect(matrix.modules[0]?.slice(0, 7)).toEqual([true, true, true, true, true, true, true]);
    expect(matrix.modules[3]?.slice(0, 7)).toEqual([true, false, true, true, true, false, true]);
    expect(matrix.modules[6]?.slice(0, 7)).toEqual([true, true, true, true, true, true, true]);
  });
});

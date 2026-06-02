import { describe, expect, it } from 'vitest';
import { isAuditorOnly } from './isAuditorOnly';

describe('isAuditorOnly', () => {
  it('is true when the only role is auditor', () => {
    expect(isAuditorOnly('auditor')).toBe(true);
  });

  it('is true when every role entry is auditor', () => {
    expect(isAuditorOnly('auditor, auditor')).toBe(true);
  });

  it('is false when another role is present alongside auditor', () => {
    expect(isAuditorOnly('auditor,employee')).toBe(false);
    expect(isAuditorOnly('owner')).toBe(false);
  });

  it('is false for empty or missing roles', () => {
    expect(isAuditorOnly('')).toBe(false);
    expect(isAuditorOnly(null)).toBe(false);
    expect(isAuditorOnly(undefined)).toBe(false);
  });
});

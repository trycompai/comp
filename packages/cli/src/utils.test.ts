import { describe, it, expect } from 'bun:test';
import { extractFlag, hasFlag } from './utils';

describe('extractFlag', () => {
  it('should return value after the flag', () => {
    expect(extractFlag(['--limit', '10'], '--limit')).toBe('10');
  });

  it('should return undefined when flag is missing', () => {
    expect(extractFlag(['--offset', '5'], '--limit')).toBeUndefined();
  });

  it('should return undefined when flag is last arg (no value)', () => {
    expect(extractFlag(['--limit'], '--limit')).toBeUndefined();
  });

  it('should handle flag in the middle of args', () => {
    expect(extractFlag(['orgs', '--limit', '10', '--offset', '5'], '--limit')).toBe('10');
    expect(extractFlag(['orgs', '--limit', '10', '--offset', '5'], '--offset')).toBe('5');
  });

  it('should return undefined for empty args', () => {
    expect(extractFlag([], '--limit')).toBeUndefined();
  });
});

describe('hasFlag', () => {
  it('should return true when flag is present', () => {
    expect(hasFlag(['--local', '--verbose'], '--local')).toBe(true);
  });

  it('should return false when flag is absent', () => {
    expect(hasFlag(['--local'], '--staging')).toBe(false);
  });

  it('should return false for empty args', () => {
    expect(hasFlag([], '--local')).toBe(false);
  });
});

import { describe, it, expect } from 'bun:test';
import { evaluateCondition, evaluateOperator, resolvePath } from '../expression-evaluator';
import type { Condition } from '../types';

describe('resolvePath', () => {
  it('resolves top-level keys', () => {
    expect(resolvePath({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('resolves nested paths', () => {
    expect(resolvePath({ user: { profile: { email: 'a@b.com' } } }, 'user.profile.email')).toBe('a@b.com');
  });

  it('returns undefined for missing paths', () => {
    expect(resolvePath({ user: {} }, 'user.profile.email')).toBeUndefined();
  });

  it('returns undefined when traversing non-object', () => {
    expect(resolvePath({ user: 'string' }, 'user.name')).toBeUndefined();
  });

  it('handles null intermediate values', () => {
    expect(resolvePath({ user: null }, 'user.name')).toBeUndefined();
  });
});

describe('evaluateOperator', () => {
  it('eq: strict equality', () => {
    expect(evaluateOperator('eq', 'hello', 'hello')).toBe(true);
    expect(evaluateOperator('eq', 42, 42)).toBe(true);
    expect(evaluateOperator('eq', true, true)).toBe(true);
    expect(evaluateOperator('eq', 'hello', 'world')).toBe(false);
  });

  it('neq: strict inequality', () => {
    expect(evaluateOperator('neq', 'hello', 'world')).toBe(true);
    expect(evaluateOperator('neq', 'hello', 'hello')).toBe(false);
  });

  it('gt/gte/lt/lte: numeric comparisons', () => {
    expect(evaluateOperator('gt', 5, 3)).toBe(true);
    expect(evaluateOperator('gt', 3, 5)).toBe(false);
    expect(evaluateOperator('gte', 5, 5)).toBe(true);
    expect(evaluateOperator('lt', 3, 5)).toBe(true);
    expect(evaluateOperator('lte', 5, 5)).toBe(true);
  });

  it('gt/gte/lt/lte: returns false for non-numbers', () => {
    expect(evaluateOperator('gt', 'five', 3)).toBe(false);
    expect(evaluateOperator('lt', 3, 'five' as unknown as number)).toBe(false);
  });

  it('exists/notExists', () => {
    expect(evaluateOperator('exists', 'value', undefined)).toBe(true);
    expect(evaluateOperator('exists', 0, undefined)).toBe(true);
    expect(evaluateOperator('exists', null, undefined)).toBe(false);
    expect(evaluateOperator('exists', undefined, undefined)).toBe(false);
    expect(evaluateOperator('notExists', null, undefined)).toBe(true);
    expect(evaluateOperator('notExists', 'value', undefined)).toBe(false);
  });

  it('truthy/falsy', () => {
    expect(evaluateOperator('truthy', true, undefined)).toBe(true);
    expect(evaluateOperator('truthy', 1, undefined)).toBe(true);
    expect(evaluateOperator('truthy', 'yes', undefined)).toBe(true);
    expect(evaluateOperator('truthy', false, undefined)).toBe(false);
    expect(evaluateOperator('truthy', 0, undefined)).toBe(false);
    expect(evaluateOperator('truthy', '', undefined)).toBe(false);
    expect(evaluateOperator('falsy', false, undefined)).toBe(true);
    expect(evaluateOperator('falsy', null, undefined)).toBe(true);
  });

  it('contains: strings and arrays', () => {
    expect(evaluateOperator('contains', 'hello world', 'world')).toBe(true);
    expect(evaluateOperator('contains', 'hello', 'world')).toBe(false);
    expect(evaluateOperator('contains', ['a', 'b', 'c'], 'b')).toBe(true);
    expect(evaluateOperator('contains', ['a', 'b'], 'd')).toBe(false);
  });

  it('matches: regex', () => {
    expect(evaluateOperator('matches', 'hello-world-123', '^hello-.*-\\d+$')).toBe(true);
    expect(evaluateOperator('matches', 'goodbye', '^hello')).toBe(false);
  });

  it('in: checks membership in array', () => {
    expect(evaluateOperator('in', 'high', ['high', 'critical'])).toBe(true);
    expect(evaluateOperator('in', 'low', ['high', 'critical'])).toBe(false);
  });

  it('age_within_days: checks date is recent', () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(evaluateOperator('age_within_days', recent, 7)).toBe(true);

    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(evaluateOperator('age_within_days', old, 7)).toBe(false);
  });

  it('age_exceeds_days: checks date is old', () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(evaluateOperator('age_exceeds_days', old, 7)).toBe(true);

    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(evaluateOperator('age_exceeds_days', recent, 7)).toBe(false);
  });
});

describe('evaluateCondition', () => {
  it('evaluates simple field condition', () => {
    const condition: Condition = { field: 'user.mfa_enabled', operator: 'eq', value: true };
    expect(evaluateCondition(condition, { user: { mfa_enabled: true } })).toBe(true);
    expect(evaluateCondition(condition, { user: { mfa_enabled: false } })).toBe(false);
  });

  it('evaluates AND condition', () => {
    const condition: Condition = {
      op: 'and',
      conditions: [
        { field: 'user.active', operator: 'eq', value: true },
        { field: 'user.mfa_enabled', operator: 'eq', value: true },
      ],
    };

    expect(evaluateCondition(condition, { user: { active: true, mfa_enabled: true } })).toBe(true);
    expect(evaluateCondition(condition, { user: { active: true, mfa_enabled: false } })).toBe(false);
  });

  it('evaluates OR condition', () => {
    const condition: Condition = {
      op: 'or',
      conditions: [
        { field: 'user.admin', operator: 'eq', value: true },
        { field: 'user.mfa_enabled', operator: 'eq', value: true },
      ],
    };

    expect(evaluateCondition(condition, { user: { admin: false, mfa_enabled: true } })).toBe(true);
    expect(evaluateCondition(condition, { user: { admin: false, mfa_enabled: false } })).toBe(false);
  });

  it('evaluates NOT condition', () => {
    const condition: Condition = {
      op: 'not',
      condition: { field: 'user.disabled', operator: 'eq', value: true },
    };

    expect(evaluateCondition(condition, { user: { disabled: false } })).toBe(true);
    expect(evaluateCondition(condition, { user: { disabled: true } })).toBe(false);
  });

  it('evaluates nested logical conditions', () => {
    const condition: Condition = {
      op: 'and',
      conditions: [
        { field: 'user.active', operator: 'eq', value: true },
        {
          op: 'or',
          conditions: [
            { field: 'user.role', operator: 'eq', value: 'admin' },
            { field: 'user.mfa_enabled', operator: 'eq', value: true },
          ],
        },
      ],
    };

    expect(evaluateCondition(condition, { user: { active: true, role: 'user', mfa_enabled: true } })).toBe(true);
    expect(evaluateCondition(condition, { user: { active: true, role: 'user', mfa_enabled: false } })).toBe(false);
    expect(evaluateCondition(condition, { user: { active: false, role: 'admin', mfa_enabled: true } })).toBe(false);
  });
});

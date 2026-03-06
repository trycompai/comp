import { describe, it, expect } from 'bun:test';
import { interpolate, interpolateTemplate } from '../template-engine';

describe('interpolate', () => {
  it('replaces simple variables', () => {
    expect(interpolate('Hello {{name}}!', { name: 'Alice' })).toBe('Hello Alice!');
  });

  it('replaces nested variables', () => {
    expect(
      interpolate('Email: {{user.email}}', { user: { email: 'a@b.com' } }),
    ).toBe('Email: a@b.com');
  });

  it('handles missing variables as empty strings', () => {
    expect(interpolate('Hello {{missing}}!', {})).toBe('Hello !');
  });

  it('handles null values as empty strings', () => {
    expect(interpolate('Value: {{val}}', { val: null })).toBe('Value: ');
  });

  it('handles numeric values', () => {
    expect(interpolate('Count: {{count}}', { count: 42 })).toBe('Count: 42');
  });

  it('handles boolean values', () => {
    expect(interpolate('Active: {{active}}', { active: true })).toBe('Active: true');
  });

  it('handles object values as JSON', () => {
    expect(interpolate('Data: {{obj}}', { obj: { a: 1 } })).toBe('Data: {"a":1}');
  });

  it('replaces {{now}} with current ISO timestamp', () => {
    const result = interpolate('Time: {{now}}', {});
    expect(result).toMatch(/Time: \d{4}-\d{2}-\d{2}T/);
  });

  it('handles multiple replacements', () => {
    expect(
      interpolate('{{first}} {{last}}', { first: 'John', last: 'Doe' }),
    ).toBe('John Doe');
  });

  it('handles whitespace in variable names', () => {
    expect(interpolate('{{ name }}', { name: 'Alice' })).toBe('Alice');
  });
});

describe('interpolateTemplate', () => {
  it('interpolates all string values in an object', () => {
    const result = interpolateTemplate(
      {
        title: 'MFA enabled for {{user.email}}',
        description: 'User {{user.name}} has MFA configured',
        severity: 'high',
      },
      { user: { email: 'a@b.com', name: 'Alice' } },
    );

    expect(result).toEqual({
      title: 'MFA enabled for a@b.com',
      description: 'User Alice has MFA configured',
      severity: 'high',
    });
  });

  it('leaves non-string values unchanged', () => {
    const result = interpolateTemplate(
      {
        title: 'Test',
        count: 42 as unknown as string,
        active: true as unknown as string,
      },
      {},
    );

    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
  });

  it('handles nested objects', () => {
    const result = interpolateTemplate(
      {
        title: '{{name}}',
        meta: {
          resource: '{{resourceId}}',
        },
      } as Record<string, unknown>,
      { name: 'Test', resourceId: 'res-1' },
    );

    expect(result.title).toBe('Test');
    expect((result.meta as Record<string, unknown>).resource).toBe('res-1');
  });
});

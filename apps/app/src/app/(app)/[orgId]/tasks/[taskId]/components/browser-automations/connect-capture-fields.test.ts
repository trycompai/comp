import { describe, expect, it } from 'vitest';
import type { LoginAnalysis } from '../../hooks/types';
import { deriveCaptureFields } from './connect-capture-fields';

function analysis(overrides: Partial<LoginAnalysis> = {}): LoginAnalysis {
  return {
    reachable: true,
    detectedMethods: ['password'],
    identifierType: 'email',
    extraFields: [],
    recommendation: { category: 'ready', headline: '', detail: '' },
    ...overrides,
  };
}

describe('deriveCaptureFields', () => {
  it('promotes a detected "IAM username" extra to the identifier (no duplicate)', () => {
    const { fields, manual } = deriveCaptureFields(
      analysis({
        identifierType: 'username',
        extraFields: [{ label: 'Account ID or alias' }, { label: 'IAM username' }],
      }),
    );
    expect(manual).toBe(false);
    expect(fields.map((f) => `${f.label}:${f.kind}`)).toEqual([
      'Account ID or alias:text',
      'IAM username:identifier',
      'Password:password',
    ]);
    // Exactly one identifier — no redundant generic username.
    expect(fields.filter((f) => f.kind === 'identifier')).toHaveLength(1);
  });

  it('appends a generic identifier (from identifierType) when no extra matches', () => {
    const { fields } = deriveCaptureFields(
      analysis({ identifierType: 'email', extraFields: [{ label: 'Workspace' }] }),
    );
    expect(fields.map((f) => `${f.label}:${f.kind}`)).toEqual([
      'Workspace:text',
      'Email:identifier',
      'Password:password',
    ]);
  });

  it('is just email + password for a simple site', () => {
    const { fields, manual } = deriveCaptureFields(analysis());
    expect(manual).toBe(false);
    expect(fields.map((f) => f.label)).toEqual(['Email', 'Password']);
  });

  it('falls back to a generic manual form when the page is unreadable', () => {
    const { fields, manual } = deriveCaptureFields(
      analysis({ reachable: false, detectedMethods: [], extraFields: [] }),
    );
    expect(manual).toBe(true);
    expect(fields.map((f) => f.label)).toEqual(['Username or email', 'Password']);
  });

  it('falls back to manual for a null analysis', () => {
    expect(deriveCaptureFields(null).manual).toBe(true);
  });
});

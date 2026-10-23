import { describe, expect, it } from 'vitest';
import { isCredentialFieldVisible, visibleCredentialFields } from './credential-field-visibility';

const region = { id: 'region', label: 'Region', type: 'select', required: true } as const;
const tenant = {
  id: 'tenant',
  label: 'Tenant name',
  type: 'text',
  required: true,
  showIf: { field: 'region', equals: 'dedicated' },
} as const;

describe('isCredentialFieldVisible', () => {
  it('shows a field that declares no condition', () => {
    expect(isCredentialFieldVisible(region, {})).toBe(true);
  });

  it('hides a conditional field while its controlling value differs', () => {
    expect(isCredentialFieldVisible(tenant, { region: 'eu' })).toBe(false);
  });

  it('shows a conditional field once its controlling value matches', () => {
    expect(isCredentialFieldVisible(tenant, { region: 'dedicated' })).toBe(true);
  });

  it('hides a conditional field when the controlling value is missing', () => {
    expect(isCredentialFieldVisible(tenant, {})).toBe(false);
  });

  it('does not match a controlling value held as an array', () => {
    // Multi-select fields hold arrays; an array never equals a scalar, and
    // coercing it would make ['dedicated'] silently satisfy the condition.
    expect(isCredentialFieldVisible(tenant, { region: ['dedicated'] })).toBe(false);
  });
});

describe('visibleCredentialFields', () => {
  it('keeps only the fields the operator can see', () => {
    expect(visibleCredentialFields([region, tenant], { region: 'eu' })).toEqual([region]);
    expect(visibleCredentialFields([region, tenant], { region: 'dedicated' })).toEqual([
      region,
      tenant,
    ]);
  });
});

import type { ConnectionListItem } from '@/hooks/use-integration-platform';
import { describe, expect, it } from 'vitest';
import { getConnectionDisplayLabel, getRegionCount } from './connection-display';

function conn(overrides: Partial<ConnectionListItem> & { id: string }): ConnectionListItem {
  return {
    providerId: 'prv_x',
    providerSlug: 'aws',
    providerName: 'AWS',
    status: 'active',
    authStrategy: 'custom',
    lastSyncAt: null,
    nextSyncAt: null,
    errorMessage: null,
    variables: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getConnectionDisplayLabel', () => {
  it('prefers connectionName from metadata', () => {
    expect(
      getConnectionDisplayLabel(
        conn({
          id: 'icn_abc',
          metadata: { connectionName: 'Production', accountId: '123' },
        }),
      ),
    ).toBe('Production');
  });

  it('uses AWS accountId when no connectionName', () => {
    expect(
      getConnectionDisplayLabel(
        conn({
          id: 'icn_abc',
          metadata: { accountId: '013388577167' },
        }),
      ),
    ).toBe('AWS 013388577167');
  });

  it('parses account id from roleArn', () => {
    expect(
      getConnectionDisplayLabel(
        conn({
          id: 'icn_abc',
          metadata: { roleArn: 'arn:aws:iam::013388577167:role/x' },
        }),
      ),
    ).toBe('AWS 013388577167');
  });
});

describe('getRegionCount', () => {
  it('returns length of regions array in metadata', () => {
    expect(
      getRegionCount(
        conn({
          id: 'icn_x',
          metadata: { regions: ['us-east-1', 'eu-west-1'] },
        }),
      ),
    ).toBe(2);
  });

  it('returns 0 when missing', () => {
    expect(getRegionCount(null)).toBe(0);
  });
});

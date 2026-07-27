import { describe, expect, it } from 'vitest';
import { buildTwoFactorStatusMap } from './two-factor-status-map';

const members = [
  { id: 'mem_1', user: { email: 'Alice@X.com' } },
  { id: 'mem_2', user: { email: 'bob@x.com' } },
  { id: 'mem_3', user: { email: 'carol@x.com' } },
  { id: 'mem_4', user: { email: null } },
];

describe('buildTwoFactorStatusMap', () => {
  it('returns an empty map when no source is configured', () => {
    expect(
      buildTwoFactorStatusMap(members, {
        configured: false,
        source: null,
        statuses: [],
      }),
    ).toEqual({});
  });

  it('returns an empty map when the response is missing (fetch failed)', () => {
    expect(buildTwoFactorStatusMap(members, undefined)).toEqual({});
  });

  it('joins by email case-insensitively and resolves absence to not-provided', () => {
    const map = buildTwoFactorStatusMap(members, {
      configured: true,
      source: 'google-workspace',
      statuses: [
        { email: 'alice@x.com', status: 'enabled' },
        { email: 'BOB@x.com', status: 'missing' },
      ],
    });

    expect(map).toEqual({
      mem_1: 'enabled', // matched despite different casing on both sides
      mem_2: 'missing',
      mem_3: 'not-provided', // no result row for this member
      mem_4: 'not-provided', // member without an email can never match
    });
  });
});

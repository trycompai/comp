import { getConnectionLabel } from './connection-label';

describe('getConnectionLabel', () => {
  it('prefers the customer-set connection name', () => {
    expect(
      getConnectionLabel({
        id: 'conn1234abcd',
        metadata: {
          connectionName: 'Production AWS',
          accountId: '123456789012',
        },
      }),
    ).toBe('Production AWS');
  });

  it('trims a padded connection name', () => {
    expect(
      getConnectionLabel({
        id: 'conn1234abcd',
        metadata: { connectionName: '  Prod  ' },
      }),
    ).toBe('Prod');
  });

  it('falls back to "AWS <accountId>"', () => {
    expect(
      getConnectionLabel({
        id: 'conn1234abcd',
        metadata: { accountId: '123456789012' },
      }),
    ).toBe('AWS 123456789012');
  });

  it('derives the account id from a commercial role ARN', () => {
    expect(
      getConnectionLabel({
        id: 'conn1234abcd',
        metadata: {
          roleArn: 'arn:aws:iam::953349023881:role/CompSecurityAudit',
        },
      }),
    ).toBe('AWS 953349023881');
  });

  it('derives the account id from a GovCloud role ARN', () => {
    expect(
      getConnectionLabel({
        id: 'conn1234abcd',
        metadata: { roleArn: 'arn:aws-us-gov:iam::633779453318:role/x' },
      }),
    ).toBe('AWS 633779453318');
  });

  it('falls back to an id slice when metadata is empty', () => {
    // slice(4, 12) of 'conn1234abcd' → '1234abcd'
    expect(getConnectionLabel({ id: 'conn1234abcd', metadata: {} })).toBe(
      'Account 1234abcd',
    );
  });

  it('handles missing or non-object metadata', () => {
    expect(getConnectionLabel({ id: 'conn1234abcd' })).toBe('Account 1234abcd');
    expect(getConnectionLabel({ id: 'conn1234abcd', metadata: null })).toBe(
      'Account 1234abcd',
    );
    expect(
      getConnectionLabel({ id: 'conn1234abcd', metadata: 'not-an-object' }),
    ).toBe('Account 1234abcd');
  });

  it('ignores a blank connection name and falls through', () => {
    expect(
      getConnectionLabel({
        id: 'conn1234abcd',
        metadata: { connectionName: '   ', accountId: '123456789012' },
      }),
    ).toBe('AWS 123456789012');
  });
});

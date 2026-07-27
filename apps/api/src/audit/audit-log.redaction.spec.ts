// buildChanges -> constants.ts imports enums from @db; provide minimal stubs so
// the util can be exercised in isolation without a real Prisma client.
jest.mock('@db', () => ({
  AuditLogEntityType: {},
  CommentEntityType: {},
}));

import { buildChanges } from './audit-log.utils';

describe('audit log redaction (buildChanges)', () => {
  it('redacts the TOTP seed like other secrets, and keeps non-secret fields', () => {
    const changes = buildChanges(
      {
        username: 'user@example.com',
        password: 'hunter2',
        totpSeed: 'JBSWY3DPEHPK3PXP',
      },
      null,
      {},
    );

    expect(changes).not.toBeNull();
    // The authenticator seed is a reusable MFA secret — must be redacted like
    // the password, never written to the audit log in cleartext.
    expect(changes?.totpSeed.current).toBe('[REDACTED]');
    expect(changes?.password.current).toBe('[REDACTED]');
    // A non-secret identifier is still recorded for a useful audit trail.
    expect(changes?.username.current).toBe('user@example.com');
    // Belt and braces: the raw seed must not appear anywhere in the payload.
    expect(JSON.stringify(changes)).not.toContain('JBSWY3DPEHPK3PXP');
  });

  it('redacts a runtime totpCode as well', () => {
    const changes = buildChanges({ totpCode: '123456' }, null, {});
    expect(changes?.totpCode.current).toBe('[REDACTED]');
  });
});

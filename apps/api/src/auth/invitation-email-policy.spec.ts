import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// better-auth derives this requirement from unrelated ID-generation options
// unless it is set, so the organization plugin must state it explicitly.
describe('invitation email verification policy (structural)', () => {
  const authServer = readFileSync(join(__dirname, 'auth.server.ts'), 'utf-8');

  it('requires a verified email before an invitation is accepted, rejected or read', () => {
    expect(authServer).toMatch(
      /organization\(\{[\s\S]*?requireEmailVerificationOnInvitation:\s*true\b/,
    );
  });

  it('never disables the requirement', () => {
    expect(authServer).not.toMatch(
      /requireEmailVerificationOnInvitation:\s*false\b/,
    );
  });
});

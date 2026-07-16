import { ConflictException, Logger } from '@nestjs/common';

jest.mock('@db', () => ({
  db: {
    user: {
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
    },
    member: {
      count: jest.fn(),
    },
    organization: {
      findUniqueOrThrow: jest.fn(),
    },
  },
}));

jest.mock('../../email/trigger-email', () => ({
  triggerEmail: jest.fn().mockResolvedValue(undefined),
}));

import { db } from '@db';
import { triggerEmail } from '../../email/trigger-email';
import {
  notifyLoginEmailChanged,
  validateLoginEmailChange,
} from './login-email-change';

describe('validateLoginEmailChange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      email: 'old@company.dev',
    });
    (db.user.findFirst as jest.Mock).mockResolvedValue(null);
    (db.member.count as jest.Mock).mockResolvedValue(0);
  });

  it('normalizes the requested email and returns the change', async () => {
    const change = await validateLoginEmailChange({
      userId: 'usr_1',
      organizationId: 'org_1',
      requestedEmail: '  New@Company.IO ',
    });

    expect(change).toEqual({
      oldEmail: 'old@company.dev',
      newEmail: 'new@company.io',
    });
  });

  it('returns null when the requested email is already the login email', async () => {
    const change = await validateLoginEmailChange({
      userId: 'usr_1',
      organizationId: 'org_1',
      requestedEmail: 'OLD@company.dev',
    });

    expect(change).toBeNull();
    expect(db.user.findFirst).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the email belongs to another account', async () => {
    (db.user.findFirst as jest.Mock).mockResolvedValue({ id: 'usr_other' });

    await expect(
      validateLoginEmailChange({
        userId: 'usr_1',
        organizationId: 'org_1',
        requestedEmail: 'taken@company.io',
      }),
    ).rejects.toThrow(ConflictException);

    expect(db.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: 'taken@company.io', mode: 'insensitive' },
        id: { not: 'usr_1' },
      },
      select: { id: true },
    });
  });

  it('throws ConflictException when the user is active in other organizations', async () => {
    (db.member.count as jest.Mock).mockResolvedValue(1);

    await expect(
      validateLoginEmailChange({
        userId: 'usr_1',
        organizationId: 'org_1',
        requestedEmail: 'new@company.io',
      }),
    ).rejects.toThrow(ConflictException);

    expect(db.member.count).toHaveBeenCalledWith({
      where: {
        userId: 'usr_1',
        organizationId: { not: 'org_1' },
        isActive: true,
        deactivated: false,
      },
    });
  });
});

describe('notifyLoginEmailChanged', () => {
  const logger = { error: jest.fn() } as unknown as Logger;
  const change = { oldEmail: 'old@company.dev', newEmail: 'new@company.io' };

  beforeEach(() => {
    jest.clearAllMocks();
    (db.organization.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      name: 'Acme',
    });
  });

  it('notifies both the old and new address', async () => {
    await notifyLoginEmailChanged({
      organizationId: 'org_1',
      change,
      logger,
    });

    expect(triggerEmail).toHaveBeenCalledTimes(2);
    const recipients = (triggerEmail as jest.Mock).mock.calls.map(
      ([params]) => params.to,
    );
    expect(recipients).toEqual(
      expect.arrayContaining(['old@company.dev', 'new@company.io']),
    );
  });

  it('swallows notification failures instead of failing the update', async () => {
    (triggerEmail as jest.Mock).mockRejectedValue(new Error('smtp down'));

    await expect(
      notifyLoginEmailChanged({ organizationId: 'org_1', change, logger }),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalled();
  });
});

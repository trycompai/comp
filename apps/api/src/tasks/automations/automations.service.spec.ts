import { ConflictException, NotFoundException } from '@nestjs/common';

// Mock the DB layer before importing the service. We also provide a stand-in
// Prisma.PrismaClientKnownRequestError so the service's `instanceof` checks and
// error-code branches can be exercised without a real database.
jest.mock('@db', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, { code }: { code: string }) {
      super(message);
      this.code = code;
      this.name = 'PrismaClientKnownRequestError';
    }
  }

  return {
    db: {
      $transaction: jest.fn(),
      evidenceAutomationVersion: { create: jest.fn() },
      evidenceAutomation: { update: jest.fn() },
    },
    Prisma: { PrismaClientKnownRequestError },
  };
});

import { db, Prisma } from '@db';
import { AutomationsService } from './automations.service';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(code, {
    code,
    clientVersion: '5.0.0',
  });

describe('AutomationsService.createVersion — error mapping', () => {
  let service: AutomationsService;
  const input = { version: 1, scriptKey: 'org_1/tsk_1/aut_1.v1.js' };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutomationsService();
  });

  it('records the version and returns it on success', async () => {
    const created = { id: 'eav_1', version: 1, scriptKey: input.scriptKey };
    (db.$transaction as jest.Mock).mockResolvedValue([created, { id: 'aut_1' }]);

    const result = await service.createVersion('aut_1', input);

    expect(result).toEqual({ success: true, version: created });
  });

  it('maps a duplicate version (P2002) to a 409 ConflictException', async () => {
    (db.$transaction as jest.Mock).mockRejectedValue(prismaError('P2002'));

    await expect(service.createVersion('aut_1', input)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('maps a missing automation (P2003 FK violation) to a 404 NotFoundException', async () => {
    (db.$transaction as jest.Mock).mockRejectedValue(prismaError('P2003'));

    await expect(
      service.createVersion('missing', input),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps a missing automation (P2025 record not found) to a 404 NotFoundException', async () => {
    (db.$transaction as jest.Mock).mockRejectedValue(prismaError('P2025'));

    await expect(
      service.createVersion('missing', input),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rethrows unexpected errors untouched (no masking real 500s)', async () => {
    const boom = new Error('db exploded');
    (db.$transaction as jest.Mock).mockRejectedValue(boom);

    await expect(service.createVersion('aut_1', input)).rejects.toBe(boom);
  });
});

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
      evidenceAutomationVersion: { create: jest.fn(), findMany: jest.fn() },
      evidenceAutomation: {
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      evidenceAutomationRun: { findMany: jest.fn() },
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

describe('AutomationsService — cross-tenant automation scoping', () => {
  let service: AutomationsService;
  const scope = {
    organizationId: 'org_1',
    taskId: 'tsk_1',
    automationId: 'aut_1',
  };
  const owningAutomation = { id: 'aut_1', taskId: 'tsk_1', name: 'Automation' };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutomationsService();
  });

  describe('findById', () => {
    it('returns the automation when it belongs to the task/organization', async () => {
      (db.evidenceAutomation.findFirst as jest.Mock).mockResolvedValue(
        owningAutomation,
      );

      const result = await service.findById(scope);

      expect(result).toEqual({ success: true, automation: owningAutomation });
      expect(db.evidenceAutomation.findFirst).toHaveBeenCalledWith({
        where: {
          id: scope.automationId,
          taskId: scope.taskId,
          task: { organizationId: scope.organizationId },
        },
      });
    });

    it('404s when the automation belongs to a different task/organization', async () => {
      (db.evidenceAutomation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findById(scope)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateAutomationDto = { name: 'New name' };

    it('updates the automation when scoped ownership checks out', async () => {
      (db.evidenceAutomation.findFirst as jest.Mock).mockResolvedValue(
        owningAutomation,
      );
      (db.evidenceAutomation.update as jest.Mock).mockResolvedValue({
        id: 'aut_1',
        name: 'New name',
        description: null,
      });

      const result = await service.update({ ...scope, updateAutomationDto });

      expect(result.success).toBe(true);
      expect(db.evidenceAutomation.update).toHaveBeenCalled();
    });

    it('404s instead of updating when the automation belongs to another org', async () => {
      (db.evidenceAutomation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update({ ...scope, updateAutomationDto }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.evidenceAutomation.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes the automation when scoped ownership checks out', async () => {
      (db.evidenceAutomation.findFirst as jest.Mock).mockResolvedValue(
        owningAutomation,
      );
      (db.evidenceAutomation.delete as jest.Mock).mockResolvedValue(
        owningAutomation,
      );

      const result = await service.delete(scope);

      expect(result).toEqual({
        success: true,
        message: 'Automation deleted successfully',
      });
    });

    it('404s instead of deleting when the automation belongs to another org', async () => {
      (db.evidenceAutomation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete(scope)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(db.evidenceAutomation.delete).not.toHaveBeenCalled();
    });
  });

  describe('findRunsByAutomationId', () => {
    it('returns runs when scoped ownership checks out', async () => {
      (db.evidenceAutomation.findFirst as jest.Mock).mockResolvedValue(
        owningAutomation,
      );
      (db.evidenceAutomationRun.findMany as jest.Mock).mockResolvedValue([
        { id: 'ear_1' },
      ]);

      const result = await service.findRunsByAutomationId(scope);

      expect(result).toEqual([{ id: 'ear_1' }]);
    });

    it('404s instead of listing runs when the automation belongs to another org', async () => {
      (db.evidenceAutomation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findRunsByAutomationId(scope),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.evidenceAutomationRun.findMany).not.toHaveBeenCalled();
    });
  });

  describe('listVersions', () => {
    it('returns versions when scoped ownership checks out', async () => {
      (db.evidenceAutomation.findFirst as jest.Mock).mockResolvedValue(
        owningAutomation,
      );
      (db.evidenceAutomationVersion.findMany as jest.Mock).mockResolvedValue([
        { id: 'eav_1' },
      ]);

      const result = await service.listVersions(scope);

      expect(result).toEqual({ success: true, versions: [{ id: 'eav_1' }] });
    });

    it('404s instead of listing versions when the automation belongs to another org', async () => {
      (db.evidenceAutomation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.listVersions(scope)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(db.evidenceAutomationVersion.findMany).not.toHaveBeenCalled();
    });
  });
});

describe('AutomationsService.createVersion — error mapping', () => {
  let service: AutomationsService;
  const scope = {
    organizationId: 'org_1',
    taskId: 'tsk_1',
    automationId: 'aut_1',
  };
  const data = { version: 1, scriptKey: 'org_1/tsk_1/aut_1.v1.js' };
  const owningAutomation = { id: 'aut_1', taskId: 'tsk_1', name: 'Automation' };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutomationsService();
    (db.evidenceAutomation.findFirst as jest.Mock).mockResolvedValue(
      owningAutomation,
    );
  });

  it('records the version and returns it on success', async () => {
    const created = { id: 'eav_1', version: 1, scriptKey: data.scriptKey };
    (db.$transaction as jest.Mock).mockResolvedValue([
      created,
      { id: 'aut_1' },
    ]);

    const result = await service.createVersion({ ...scope, data });

    expect(result).toEqual({ success: true, version: created });
  });

  it('maps a duplicate version (P2002) to a 409 ConflictException', async () => {
    (db.$transaction as jest.Mock).mockRejectedValue(prismaError('P2002'));

    await expect(
      service.createVersion({ ...scope, data }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps a missing automation (P2003 FK violation) to a 404 NotFoundException', async () => {
    (db.$transaction as jest.Mock).mockRejectedValue(prismaError('P2003'));

    await expect(
      service.createVersion({ ...scope, data }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps a missing automation (P2025 record not found) to a 404 NotFoundException', async () => {
    (db.$transaction as jest.Mock).mockRejectedValue(prismaError('P2025'));

    await expect(
      service.createVersion({ ...scope, data }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rethrows unexpected errors untouched (no masking real 500s)', async () => {
    const boom = new Error('db exploded');
    (db.$transaction as jest.Mock).mockRejectedValue(boom);

    await expect(service.createVersion({ ...scope, data })).rejects.toBe(boom);
  });

  it('404s before attempting the transaction when the automation belongs to another org', async () => {
    (db.evidenceAutomation.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.createVersion({ ...scope, data }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

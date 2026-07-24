import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockDb = {
  risk: { findFirst: jest.fn() },
  vendor: { findFirst: jest.fn() },
  member: { findFirst: jest.fn() },
  riskAcceptance: { findMany: jest.fn(), create: jest.fn() },
  // The create paths run inside a transaction with a subject row-lock; the
  // callback receives this same mock as the transaction client.
  $transaction: jest.fn(
    (fn: (tx: typeof mockDb) => unknown): unknown => fn(mockDb),
  ),
  $queryRaw: jest.fn().mockResolvedValue([]),
};

jest.mock('@db', () => ({ db: mockDb }));

import { RiskAcceptancesService } from './risk-acceptances.service';

const ORG = 'org_1';

const baseRisk = {
  assigneeId: 'mem_owner',
  residualLikelihood: 'unlikely',
  residualImpact: 'minor',
};

const activeMember = {
  deactivated: false,
  user: { name: 'Jane Doe', email: 'jane@acme.com' },
};

const storedRow = {
  id: 'rska_1',
  acceptedById: 'mem_owner',
  acceptedByName: 'Jane Doe',
  notes: null,
  residualLikelihood: 'unlikely',
  residualImpact: 'minor',
  createdAt: new Date('2026-04-15T00:00:00Z'),
};

describe('RiskAcceptancesService', () => {
  let service: RiskAcceptancesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RiskAcceptancesService();
  });

  describe('createForRisk', () => {
    it('freezes the current residual rating and the acceptor name', async () => {
      mockDb.risk.findFirst.mockResolvedValue(baseRisk);
      mockDb.member.findFirst.mockResolvedValue(activeMember);
      mockDb.riskAcceptance.create.mockResolvedValue(storedRow);

      const view = await service.createForRisk('rsk_1', ORG, {});

      expect(mockDb.riskAcceptance.create).toHaveBeenCalledWith({
        data: {
          organizationId: ORG,
          riskId: 'rsk_1',
          acceptedById: 'mem_owner',
          acceptedByName: 'Jane Doe',
          notes: null,
          residualLikelihood: 'unlikely',
          residualImpact: 'minor',
        },
      });
      expect(view.stale).toBe(false);
      // unlikely(2) x minor(2) = raw 4 -> score 2 -> very-low (score bands,
      // matching RiskScoreBadge / TreatmentHero)
      expect(view.levelLabel).toBe('Very low');
    });

    it('row-locks the risk and writes through the same transaction', async () => {
      mockDb.risk.findFirst.mockResolvedValue(baseRisk);
      mockDb.member.findFirst.mockResolvedValue(activeMember);
      mockDb.riskAcceptance.create.mockResolvedValue(storedRow);

      await service.createForRisk('rsk_1', ORG, {});

      // The subject lock serializes concurrent residual edits with the
      // read-freeze-insert sequence, so a fresh acceptance can never be
      // recorded against an already-superseded rating.
      expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
      expect(mockDb.$queryRaw).toHaveBeenCalledTimes(1);
      const rawQuery = mockDb.$queryRaw.mock.calls[0][0].join('?');
      expect(rawQuery).toContain('FOR UPDATE');
    });

    it('defaults the acceptor to the risk owner (assignee)', async () => {
      mockDb.risk.findFirst.mockResolvedValue(baseRisk);
      mockDb.member.findFirst.mockResolvedValue(activeMember);
      mockDb.riskAcceptance.create.mockResolvedValue(storedRow);

      await service.createForRisk('rsk_1', ORG, {});

      expect(mockDb.member.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mem_owner', organizationId: ORG },
        }),
      );
    });

    it('uses the explicit acceptor over the owner when provided', async () => {
      mockDb.risk.findFirst.mockResolvedValue(baseRisk);
      mockDb.member.findFirst.mockResolvedValue(activeMember);
      mockDb.riskAcceptance.create.mockResolvedValue(storedRow);

      await service.createForRisk('rsk_1', ORG, { acceptedById: 'mem_other' });

      expect(mockDb.member.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mem_other', organizationId: ORG },
        }),
      );
    });

    it('rejects when the risk has no owner and no acceptor was chosen', async () => {
      mockDb.risk.findFirst.mockResolvedValue({ ...baseRisk, assigneeId: null });

      await expect(service.createForRisk('rsk_1', ORG, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDb.riskAcceptance.create).not.toHaveBeenCalled();
    });

    it('rejects an acceptor outside the organization', async () => {
      mockDb.risk.findFirst.mockResolvedValue(baseRisk);
      mockDb.member.findFirst.mockResolvedValue(null);

      await expect(
        service.createForRisk('rsk_1', ORG, { acceptedById: 'mem_foreign' }),
      ).rejects.toThrow('Acceptor is not a member of this organization');
    });

    it('rejects a deactivated acceptor', async () => {
      mockDb.risk.findFirst.mockResolvedValue(baseRisk);
      mockDb.member.findFirst.mockResolvedValue({
        ...activeMember,
        deactivated: true,
      });

      await expect(service.createForRisk('rsk_1', ORG, {})).rejects.toThrow(
        'deactivated',
      );
    });

    it('falls back to the email when the acceptor has no name', async () => {
      mockDb.risk.findFirst.mockResolvedValue(baseRisk);
      mockDb.member.findFirst.mockResolvedValue({
        deactivated: false,
        user: { name: '  ', email: 'jane@acme.com' },
      });
      mockDb.riskAcceptance.create.mockResolvedValue(storedRow);

      await service.createForRisk('rsk_1', ORG, {});

      expect(mockDb.riskAcceptance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ acceptedByName: 'jane@acme.com' }),
      });
    });

    it('404s for a risk outside the organization', async () => {
      mockDb.risk.findFirst.mockResolvedValue(null);

      await expect(service.createForRisk('rsk_x', ORG, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listForRisk', () => {
    it('computes stale per event against the live residual rating', async () => {
      mockDb.risk.findFirst.mockResolvedValue({
        ...baseRisk,
        // Residual has moved since the older acceptance was recorded.
        residualLikelihood: 'possible',
        residualImpact: 'moderate',
      });
      mockDb.riskAcceptance.findMany.mockResolvedValue([
        {
          ...storedRow,
          id: 'rska_2',
          residualLikelihood: 'possible',
          residualImpact: 'moderate',
        },
        { ...storedRow, id: 'rska_1' },
      ]);

      const { acceptances } = await service.listForRisk('rsk_1', ORG);

      expect(acceptances.map((a) => a.stale)).toEqual([false, true]);
      expect(mockDb.riskAcceptance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { riskId: 'rsk_1', organizationId: ORG },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
    });

    it('404s for a risk outside the organization', async () => {
      mockDb.risk.findFirst.mockResolvedValue(null);

      await expect(service.listForRisk('rsk_x', ORG)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('vendor variants', () => {
    it('normalizes residualProbability into the shared rating shape', async () => {
      mockDb.vendor.findFirst.mockResolvedValue({
        assigneeId: 'mem_owner',
        residualProbability: 'likely',
        residualImpact: 'major',
      });
      mockDb.member.findFirst.mockResolvedValue(activeMember);
      mockDb.riskAcceptance.create.mockResolvedValue({
        ...storedRow,
        residualLikelihood: 'likely',
        residualImpact: 'major',
      });

      const view = await service.createForVendor('vnd_1', ORG, {});

      expect(mockDb.riskAcceptance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vendorId: 'vnd_1',
          residualLikelihood: 'likely',
          residualImpact: 'major',
        }),
      });
      expect(view.levelLabel).toBe('High'); // likely(4) x major(4) = raw 16 -> score 7 -> high
    });

    it('lists vendor acceptances by vendorId', async () => {
      mockDb.vendor.findFirst.mockResolvedValue({
        assigneeId: null,
        residualProbability: 'unlikely',
        residualImpact: 'minor',
      });
      mockDb.riskAcceptance.findMany.mockResolvedValue([storedRow]);

      const { acceptances } = await service.listForVendor('vnd_1', ORG);

      expect(acceptances).toHaveLength(1);
      expect(acceptances[0].stale).toBe(false);
      expect(mockDb.riskAcceptance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vendorId: 'vnd_1', organizationId: ORG },
        }),
      );
    });
  });

  it('exposes no update or delete — acceptances are append-only', () => {
    const surface = Object.getOwnPropertyNames(
      Object.getPrototypeOf(service),
    ).filter((name) => name !== 'constructor');
    expect(surface.some((name) => /update|delete|remove/i.test(name))).toBe(
      false,
    );
  });
});

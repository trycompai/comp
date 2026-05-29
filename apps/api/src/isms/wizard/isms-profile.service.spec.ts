import { NotFoundException } from '@nestjs/common';
import { ZodError } from 'zod';
import { db } from '@db';
import { IsmsProfileService } from './isms-profile.service';
import { IsmsService } from '../isms.service';
import { IsmsContextService } from '../isms-context.service';
import { computeWizardDefaults } from './wizard-defaults';

jest.mock('@db', () => ({
  db: {
    frameworkEditorFramework: { findUnique: jest.fn() },
    ismsProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ismsDocument: { findMany: jest.fn() },
    member: { findMany: jest.fn() },
  },
}));
jest.mock('./wizard-defaults', () => ({
  computeWizardDefaults: jest.fn(),
}));

const mockDb = jest.mocked(db);
const mockDefaults = jest.mocked(computeWizardDefaults);

const fullAnswers = {
  deputySpo: { memberId: 'mem_1', toBeNamed: false },
  internalAuditApproach: 'in_house' as const,
  certificationBody: 'BSI',
  insurance: { has: true, insurerName: 'Acme Cyber' },
  sectorRegulators: ['FINMA'],
  hasContractors: true,
  capabilitiesInProduction: ['Payments API'],
  cloudScopeSplit: { customer: ['Data'], provider: ['Infra'] },
  euRep: { status: 'appointed' as const, name: 'EU Rep Ltd' },
  certificateScopeSentence: 'The ISMS covers everything.',
  objectives: [{ objective: 'Stay certified', target: '100%' }],
  intendedOutcomes: ['Protect data'],
};

const defaultsFixture = {
  capabilitiesInProduction: [],
  certificateScopeSentence: 'default sentence',
  objectives: [],
  intendedOutcomes: [],
  cloudScopeSplit: { customer: [], provider: [] },
  sectorRegulatorOptions: [],
};

const args = { organizationId: 'org_1', frameworkId: 'fw_1' };

describe('IsmsProfileService', () => {
  let service: IsmsProfileService;
  let ismsService: jest.Mocked<Pick<IsmsService, 'ensureSetup'>>;
  let contextService: jest.Mocked<Pick<IsmsContextService, 'generate'>>;

  beforeEach(() => {
    jest.clearAllMocks();
    ismsService = { ensureSetup: jest.fn() };
    contextService = { generate: jest.fn() };
    service = new IsmsProfileService(
      ismsService as unknown as IsmsService,
      contextService as unknown as IsmsContextService,
    );
    (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
      id: 'fw_1',
    });
    mockDefaults.mockResolvedValue(defaultsFixture);
    (mockDb.member.findMany as jest.Mock).mockResolvedValue([]);
  });

  describe('getProfile', () => {
    it('throws NotFoundException when framework not found', async () => {
      (
        mockDb.frameworkEditorFramework.findUnique as jest.Mock
      ).mockResolvedValue(null);
      await expect(service.getProfile(args)).rejects.toThrow(NotFoundException);
    });

    it('creates the profile row when none exists (get-or-init)', async () => {
      (mockDb.ismsProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (mockDb.ismsProfile.create as jest.Mock).mockResolvedValue({
        id: 'pf_1',
        answers: {},
      });

      const result = await service.getProfile(args);

      expect(mockDb.ismsProfile.create).toHaveBeenCalledWith({
        data: { organizationId: 'org_1', frameworkId: 'fw_1', answers: {} },
      });
      expect(result.answers).toBeNull();
      expect(result.defaults).toEqual(defaultsFixture);
      expect(result.members).toEqual([]);
    });

    it('returns saved answers when the profile has them', async () => {
      (mockDb.ismsProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'pf_1',
        answers: { hasContractors: true },
      });

      const result = await service.getProfile(args);
      expect(result.answers).toEqual({ hasContractors: true });
      expect(mockDb.ismsProfile.create).not.toHaveBeenCalled();
    });

    it('maps members to {id,name} using name then email', async () => {
      (mockDb.ismsProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'pf_1',
        answers: {},
      });
      (mockDb.member.findMany as jest.Mock).mockResolvedValue([
        { id: 'mem_1', user: { name: 'Alice', email: 'a@x.com' } },
        { id: 'mem_2', user: { name: null, email: 'b@x.com' } },
      ]);

      const result = await service.getProfile(args);
      expect(result.members).toEqual([
        { id: 'mem_1', name: 'Alice' },
        { id: 'mem_2', name: 'b@x.com' },
      ]);
    });
  });

  describe('saveProfile', () => {
    it('merges the partial payload onto stored answers', async () => {
      (mockDb.ismsProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'pf_1',
        answers: { certificationBody: 'BSI' },
        completedAt: null,
      });
      (mockDb.ismsProfile.update as jest.Mock).mockResolvedValue({
        id: 'pf_1',
        answers: { certificationBody: 'BSI', hasContractors: true },
        completedAt: null,
      });

      await service.saveProfile({
        ...args,
        answers: { hasContractors: true },
        complete: false,
      });

      const updateArg = (mockDb.ismsProfile.update as jest.Mock).mock.calls[0][0];
      expect(updateArg.data.answers).toEqual({
        certificationBody: 'BSI',
        hasContractors: true,
      });
      expect(updateArg.data.completedAt).toBeNull();
    });

    it('sets completedAt and validates the full schema when complete=true', async () => {
      (mockDb.ismsProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'pf_1',
        answers: {},
        completedAt: null,
      });
      (mockDb.ismsProfile.update as jest.Mock).mockResolvedValue({
        id: 'pf_1',
        answers: fullAnswers,
        completedAt: new Date(),
      });

      await service.saveProfile({
        ...args,
        answers: fullAnswers,
        complete: true,
      });

      const updateArg = (mockDb.ismsProfile.update as jest.Mock).mock.calls[0][0];
      expect(updateArg.data.completedAt).toBeInstanceOf(Date);
    });

    it('rejects completion when the merged answers are incomplete', async () => {
      (mockDb.ismsProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'pf_1',
        answers: {},
        completedAt: null,
      });

      await expect(
        service.saveProfile({
          ...args,
          answers: { certificationBody: 'BSI' },
          complete: true,
        }),
      ).rejects.toBeInstanceOf(ZodError);
      expect(mockDb.ismsProfile.update).not.toHaveBeenCalled();
    });
  });

  describe('generateAll', () => {
    it('ensures setup then regenerates every document', async () => {
      ismsService.ensureSetup.mockResolvedValue({
        success: true,
        documents: [],
      });
      (mockDb.ismsDocument.findMany as jest.Mock).mockResolvedValue([
        { id: 'doc_1' },
        { id: 'doc_2' },
      ]);
      contextService.generate
        .mockResolvedValueOnce({ id: 'doc_1' } as never)
        .mockResolvedValueOnce({ id: 'doc_2' } as never);

      const result = await service.generateAll(args);

      expect(ismsService.ensureSetup).toHaveBeenCalledWith({
        organizationId: 'org_1',
        frameworkId: 'fw_1',
      });
      expect(contextService.generate).toHaveBeenCalledTimes(2);
      expect(contextService.generate).toHaveBeenNthCalledWith(1, {
        documentId: 'doc_1',
        organizationId: 'org_1',
      });
      expect(result).toEqual({
        success: true,
        documents: [{ id: 'doc_1' }, { id: 'doc_2' }],
      });
    });
  });
});

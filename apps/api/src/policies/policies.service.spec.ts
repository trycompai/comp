import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { PolicyPdfRendererService } from '../trust-portal/policy-pdf-renderer.service';

jest.mock('@db', () => ({
  db: {
    policy: {
      findUnique: jest.fn(),
    },
    policyVersion: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  Frequency: {
    monthly: 'monthly',
    quarterly: 'quarterly',
    yearly: 'yearly',
  },
  PolicyStatus: {
    draft: 'draft',
    published: 'published',
  },
  Prisma: {},
}));

import { db } from '@db';

describe('PoliciesService.createVersion', () => {
  let service: PoliciesService;
  const mockDb = db as jest.Mocked<typeof db>;

  const mockAttachmentsService = {
    copyPolicyVersionPdf: jest.fn(),
    deletePolicyVersionPdf: jest.fn(),
  };

  const mockPdfRendererService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        { provide: AttachmentsService, useValue: mockAttachmentsService },
        { provide: PolicyPdfRendererService, useValue: mockPdfRendererService },
      ],
    }).compile();

    service = module.get<PoliciesService>(PoliciesService);
    jest.clearAllMocks();
  });

  const organizationId = 'org_123';
  const policyId = 'pol_1';
  const userId = 'usr_1';

  const setupHappyPath = ({
    policyContent,
    currentVersionContent,
    policyPdfUrl,
    currentVersionPdfUrl,
  }: {
    policyContent: unknown[];
    currentVersionContent: unknown[] | null;
    policyPdfUrl: string | null;
    currentVersionPdfUrl: string | null;
  }) => {
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
    (mockDb.policy.findUnique as jest.Mock).mockResolvedValue({
      id: policyId,
      organizationId,
      content: policyContent,
      pdfUrl: policyPdfUrl,
      currentVersion: currentVersionContent
        ? {
            id: 'pv_1',
            content: currentVersionContent,
            pdfUrl: currentVersionPdfUrl,
          }
        : null,
      versions: [],
    });
    (mockDb.$transaction as jest.Mock).mockImplementation(async (cb) =>
      cb({
        policyVersion: {
          findFirst: jest.fn().mockResolvedValue({ version: 1 }),
          create: jest.fn().mockResolvedValue({ id: 'pv_2' }),
        },
      }),
    );
  };

  it('creates a version when editor content is empty but a PDF exists', async () => {
    setupHappyPath({
      policyContent: [],
      currentVersionContent: [],
      policyPdfUrl: 's3://bucket/policy.pdf',
      currentVersionPdfUrl: 's3://bucket/policy.pdf',
    });
    mockAttachmentsService.copyPolicyVersionPdf.mockResolvedValue(
      's3://bucket/new.pdf',
    );

    const result = await service.createVersion(
      policyId,
      organizationId,
      {},
      userId,
    );

    expect(result).toEqual({ versionId: 'pv_2', version: 2 });
    expect(mockAttachmentsService.copyPolicyVersionPdf).toHaveBeenCalled();
  });

  it('creates a version when both editor content is empty and no PDF exists', async () => {
    setupHappyPath({
      policyContent: [],
      currentVersionContent: [],
      policyPdfUrl: null,
      currentVersionPdfUrl: null,
    });

    const result = await service.createVersion(
      policyId,
      organizationId,
      {},
      userId,
    );

    expect(result).toEqual({ versionId: 'pv_2', version: 2 });
    expect(mockAttachmentsService.copyPolicyVersionPdf).not.toHaveBeenCalled();
  });

  it('creates a version with non-empty editor content', async () => {
    setupHappyPath({
      policyContent: [{ type: 'paragraph' }],
      currentVersionContent: [{ type: 'paragraph' }],
      policyPdfUrl: null,
      currentVersionPdfUrl: null,
    });

    const result = await service.createVersion(
      policyId,
      organizationId,
      {},
      userId,
    );

    expect(result).toEqual({ versionId: 'pv_2', version: 2 });
  });

  it('throws NotFound when the policy does not exist', async () => {
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
    (mockDb.policy.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.createVersion(policyId, organizationId, {}, userId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

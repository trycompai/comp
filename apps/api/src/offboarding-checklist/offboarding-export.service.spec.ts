import { PassThrough } from 'stream';

const mockDb = {
  attachment: {
    findFirst: jest.fn(),
  },
};

jest.mock('@db', () => ({
  db: mockDb,
  AttachmentEntityType: {
    offboarding_checklist: 'offboarding_checklist',
  },
}));

jest.mock('archiver', () => {
  const mockArchive = {
    pipe: jest.fn(),
    append: jest.fn(),
    finalize: jest.fn().mockResolvedValue(undefined),
  };
  return jest.fn(() => mockArchive);
});

import archiver from 'archiver';
import { OffboardingExportService } from './offboarding-export.service';

describe('OffboardingExportService', () => {
  const mockAttachmentsService = {
    getObjectBuffer: jest.fn(),
  };

  const mockAccessRevocationService = {
    getAccessRevocations: jest.fn(),
  };

  const mockChecklistService = {
    getMemberChecklist: jest.fn(),
  };

  let service: OffboardingExportService;
  let mockArchive: ReturnType<typeof archiver>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OffboardingExportService(
      mockAttachmentsService as never,
      mockAccessRevocationService as never,
      mockChecklistService as never,
    );
    mockArchive = (archiver as unknown as jest.Mock)();
  });

  it('creates a zip with summary CSV and vendor revocations CSV', async () => {
    mockChecklistService.getMemberChecklist.mockResolvedValue({
      items: [
        {
          title: 'Revoke system access',
          completed: true,
          completion: {
            completedBy: { name: 'Jane Doe' },
            completedAt: new Date('2026-05-01'),
          },
          evidence: [],
        },
        {
          title: 'Recover devices',
          completed: false,
          completion: null,
          evidence: [],
        },
      ],
      totalItems: 2,
      completedItems: 1,
    });

    mockAccessRevocationService.getAccessRevocations.mockResolvedValue({
      vendors: [
        {
          vendorName: 'Slack',
          revokedBy: { name: 'Jane Doe' },
          revokedAt: new Date('2026-05-01'),
          evidence: [],
        },
      ],
      totalVendors: 1,
      revokedCount: 1,
    });

    const output = new PassThrough();

    await service.exportMemberEvidence({
      organizationId: 'org_1',
      memberId: 'mem_1',
      output,
    });

    expect(archiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
    expect(mockArchive.pipe).toHaveBeenCalledWith(output);
    expect(mockArchive.finalize).toHaveBeenCalled();

    const appendCalls = (mockArchive.append as jest.Mock).mock.calls;
    expect(appendCalls).toHaveLength(2);

    // Summary CSV
    const summaryCsv = appendCalls[0][0] as string;
    expect(summaryCsv).toContain('Item,Status,Completed By');
    expect(summaryCsv).toContain('"Revoke system access",Complete,"Jane Doe"');
    expect(summaryCsv).toContain('"Recover devices",Pending,""');
    expect(appendCalls[0][1]).toEqual({ name: 'summary.csv' });

    // Vendor revocations CSV
    const vendorCsv = appendCalls[1][0] as string;
    expect(vendorCsv).toContain('Vendor,Confirmed By,Date,Has Evidence');
    expect(vendorCsv).toContain('"Slack","Jane Doe",2026-05-01,No');
    expect(appendCalls[1][1]).toEqual({
      name: 'vendor-access-revocations/vendor-access-revocations.csv',
    });
  });

  it('includes vendor evidence files from S3', async () => {
    mockChecklistService.getMemberChecklist.mockResolvedValue({
      items: [],
      totalItems: 0,
      completedItems: 0,
    });

    mockAccessRevocationService.getAccessRevocations.mockResolvedValue({
      vendors: [
        {
          vendorName: 'AWS',
          revokedBy: { name: 'Jane' },
          revokedAt: new Date('2026-05-01'),
          evidence: [{ id: 'att_1', name: 'aws-disable.png' }],
        },
      ],
      totalVendors: 1,
      revokedCount: 1,
    });

    mockDb.attachment.findFirst.mockResolvedValue({
      id: 'att_1',
      url: 'org_1/attachments/offboarding/aws-disable.png',
    });
    mockAttachmentsService.getObjectBuffer.mockResolvedValue(
      Buffer.from('fake-png-data'),
    );

    const output = new PassThrough();
    await service.exportMemberEvidence({
      organizationId: 'org_1',
      memberId: 'mem_1',
      output,
    });

    const appendCalls = (mockArchive.append as jest.Mock).mock.calls;
    const evidenceCall = appendCalls.find(
      (c: unknown[]) =>
        (c[1] as { name: string }).name ===
        'vendor-access-revocations/evidence/aws-disable.png',
    );
    expect(evidenceCall).toBeDefined();
    expect(Buffer.isBuffer(evidenceCall[0])).toBe(true);
  });

  it('includes checklist item evidence in numbered folders', async () => {
    mockChecklistService.getMemberChecklist.mockResolvedValue({
      items: [
        {
          title: 'Recover devices',
          completed: true,
          completion: {
            completedBy: { name: 'Jane' },
            completedAt: new Date(),
          },
          evidence: [{ id: 'att_2', name: 'device-receipt.pdf' }],
        },
      ],
      totalItems: 1,
      completedItems: 1,
    });

    mockAccessRevocationService.getAccessRevocations.mockResolvedValue({
      vendors: [],
      totalVendors: 0,
      revokedCount: 0,
    });

    mockDb.attachment.findFirst.mockResolvedValue({
      id: 'att_2',
      url: 'org_1/attachments/offboarding/device-receipt.pdf',
    });
    mockAttachmentsService.getObjectBuffer.mockResolvedValue(
      Buffer.from('fake-pdf-data'),
    );

    const output = new PassThrough();
    await service.exportMemberEvidence({
      organizationId: 'org_1',
      memberId: 'mem_1',
      output,
    });

    const appendCalls = (mockArchive.append as jest.Mock).mock.calls;
    const evidenceCall = appendCalls.find(
      (c: unknown[]) =>
        (c[1] as { name: string }).name ===
        'checklist-items/01-recover-devices/device-receipt.pdf',
    );
    expect(evidenceCall).toBeDefined();
  });

  it('skips evidence files that fail to download', async () => {
    mockChecklistService.getMemberChecklist.mockResolvedValue({
      items: [
        {
          title: 'Task with broken evidence',
          completed: true,
          completion: {
            completedBy: { name: 'Jane' },
            completedAt: new Date(),
          },
          evidence: [{ id: 'att_bad', name: 'missing.pdf' }],
        },
      ],
      totalItems: 1,
      completedItems: 1,
    });

    mockAccessRevocationService.getAccessRevocations.mockResolvedValue({
      vendors: [],
      totalVendors: 0,
      revokedCount: 0,
    });

    mockDb.attachment.findFirst.mockResolvedValue(null);

    const output = new PassThrough();
    await service.exportMemberEvidence({
      organizationId: 'org_1',
      memberId: 'mem_1',
      output,
    });

    // Should have only 2 appends: summary CSV + vendor CSV (no evidence files)
    const appendCalls = (mockArchive.append as jest.Mock).mock.calls;
    expect(appendCalls).toHaveLength(2);
    expect(mockArchive.finalize).toHaveBeenCalled();
  });
});

import { AttachmentEntityType, BackgroundCheckStatus, db } from '@db';
import { AttachmentsService } from '../attachments/attachments.service';
import { BackgroundCheckCustomService } from './background-check-custom.service';

jest.mock('@db', () => ({
  AttachmentEntityType: {
    background_check: 'background_check',
  },
  BackgroundCheckStatus: {
    invited: 'invited',
    completed: 'completed',
  },
  db: {
    backgroundCheckRequest: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
  },
}));

const mockedDb = db as jest.Mocked<typeof db>;

function mockAsync<T>(fn: unknown): jest.MockedFunction<() => Promise<T>> {
  return fn as jest.MockedFunction<() => Promise<T>>;
}

describe('BackgroundCheckCustomService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a background check record, uploads the file, then marks completed', async () => {
    const uploadAttachment = jest.fn().mockResolvedValue({
      id: 'att_1',
      name: 'report.pdf',
      type: 'document',
      downloadUrl: 'https://s3.example.com/report.pdf',
      createdAt: new Date('2026-04-29T12:00:00.000Z'),
    });
    const service = new BackgroundCheckCustomService({
      uploadAttachment,
    } as unknown as AttachmentsService);

    mockAsync<Awaited<ReturnType<typeof db.member.findFirst>>>(
      mockedDb.member.findFirst,
    ).mockResolvedValueOnce({
      id: 'mem_1',
      user: { name: 'Ada Lovelace', email: 'ada@work.example' },
    } as unknown as Awaited<ReturnType<typeof db.member.findFirst>>);
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.upsert>>>(
      mockedDb.backgroundCheckRequest.upsert,
    ).mockResolvedValueOnce({
      id: 'bcr_1',
      status: 'invited',
    } as Awaited<ReturnType<typeof db.backgroundCheckRequest.upsert>>);
    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.update>>>(
      mockedDb.backgroundCheckRequest.update,
    ).mockResolvedValueOnce({
      id: 'bcr_1',
      status: BackgroundCheckStatus.completed,
    } as Awaited<ReturnType<typeof db.backgroundCheckRequest.update>>);

    await service.attachForMember({
      organizationId: 'org_1',
      memberId: 'mem_1',
      upload: {
        fileName: 'report.pdf',
        fileType: 'application/pdf',
        fileData: 'cmVwb3J0',
      },
      userId: 'usr_1',
    });

    // Record is created with non-completed status first
    expect(mockedDb.backgroundCheckRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          employeeName: 'Ada Lovelace',
          employeeEmail: 'ada@work.example',
          status: 'invited',
        }),
      }),
    );
    // Upload happens before marking completed
    expect(uploadAttachment).toHaveBeenCalledWith(
      'org_1',
      'bcr_1',
      AttachmentEntityType.background_check,
      expect.objectContaining({
        fileName: 'report.pdf',
        fileType: 'application/pdf',
      }),
      'usr_1',
    );
    // Only marked completed after successful upload
    expect(mockedDb.backgroundCheckRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bcr_1' },
        data: expect.objectContaining({
          status: BackgroundCheckStatus.completed,
        }),
      }),
    );
  });

  it('returns custom attachments for an existing background check', async () => {
    const getAttachmentMetadata = jest.fn().mockResolvedValue([
      {
        id: 'att_1',
        name: 'report.pdf',
        type: 'document',
        createdAt: new Date('2026-04-29T12:00:00.000Z'),
      },
    ]);
    const service = new BackgroundCheckCustomService({
      getAttachmentMetadata,
    } as unknown as AttachmentsService);

    mockAsync<Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>>(
      mockedDb.backgroundCheckRequest.findUnique,
    ).mockResolvedValueOnce({
      id: 'bcr_1',
    } as Awaited<ReturnType<typeof db.backgroundCheckRequest.findUnique>>);

    const attachments = await service.getAttachmentsForMember({
      organizationId: 'org_1',
      memberId: 'mem_1',
    });

    expect(attachments).toHaveLength(1);
    expect(getAttachmentMetadata).toHaveBeenCalledWith(
      'org_1',
      'bcr_1',
      AttachmentEntityType.background_check,
    );
  });
});

import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsRoleAssignmentService } from './isms-role-assignment.service';

jest.mock('@db', () => {
  const db = {
    ismsDocument: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    ismsRole: { findFirst: jest.fn() },
    member: { findFirst: jest.fn() },
    ismsRoleAssignment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(db)),
  };
  return { db };
});

const mockDb = jest.mocked(db);

describe('IsmsRoleAssignmentService', () => {
  let service: IsmsRoleAssignmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({ status: 'draft' });
    service = new IsmsRoleAssignmentService();
  });

  const createArgs = {
    documentId: 'doc_1',
    organizationId: 'org_1',
    dto: { roleId: 'role_1', memberId: 'mem_1' },
  };

  function stubCreatePreconditions() {
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({ id: 'doc_1' });
    (mockDb.ismsRole.findFirst as jest.Mock).mockResolvedValue({ id: 'role_1' });
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
  }

  it('rejects a role that is not in the document', async () => {
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({ id: 'doc_1' });
    (mockDb.ismsRole.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.create(createArgs)).rejects.toThrow(NotFoundException);
  });

  it('rejects a member who is not in the org', async () => {
    (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({ id: 'doc_1' });
    (mockDb.ismsRole.findFirst as jest.Mock).mockResolvedValue({ id: 'role_1' });
    (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.create(createArgs)).rejects.toThrow(NotFoundException);
  });

  it('creates an assignment carrying the denormalized documentId', async () => {
    stubCreatePreconditions();
    (mockDb.ismsRoleAssignment.findFirst as jest.Mock)
      .mockResolvedValueOnce(null) // no existing (roleId, memberId)
      .mockResolvedValueOnce({ position: 0 }); // nextPosition
    (mockDb.ismsRoleAssignment.create as jest.Mock).mockResolvedValue({ id: 'ra_1' });

    await service.create(createArgs);

    expect(mockDb.ismsRoleAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        roleId: 'role_1',
        memberId: 'mem_1',
        documentId: 'doc_1',
        position: 1,
      }),
    });
  });

  it('is idempotent: returns the existing assignment instead of duplicating', async () => {
    stubCreatePreconditions();
    (mockDb.ismsRoleAssignment.findFirst as jest.Mock).mockResolvedValue({
      id: 'ra_existing',
    });

    const result = await service.create(createArgs);

    expect(result).toEqual({ id: 'ra_existing' });
    expect(mockDb.ismsRoleAssignment.create).not.toHaveBeenCalled();
  });

  it('updates competence fields', async () => {
    (mockDb.ismsRoleAssignment.findFirst as jest.Mock).mockResolvedValue({
      id: 'ra_1',
      documentId: 'doc_1',
    });
    (mockDb.ismsRoleAssignment.update as jest.Mock).mockResolvedValue({});

    await service.update({
      assignmentId: 'ra_1',
      organizationId: 'org_1',
      dto: { basisOfCompetence: 'training', gap: 'Needs ISO course' },
    });

    expect(mockDb.ismsRoleAssignment.update).toHaveBeenCalledWith({
      where: { id: 'ra_1' },
      data: expect.objectContaining({
        basisOfCompetence: 'training',
        gap: 'Needs ISO course',
      }),
    });
  });

  it('throws when updating an assignment outside the org', async () => {
    (mockDb.ismsRoleAssignment.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      service.update({ assignmentId: 'ra_x', organizationId: 'org_1', dto: {} }),
    ).rejects.toThrow(NotFoundException);
  });

  it('removes an assignment', async () => {
    (mockDb.ismsRoleAssignment.findFirst as jest.Mock).mockResolvedValue({
      id: 'ra_1',
      documentId: 'doc_1',
    });
    (mockDb.ismsRoleAssignment.delete as jest.Mock).mockResolvedValue({});
    const result = await service.remove({ assignmentId: 'ra_1', organizationId: 'org_1' });
    expect(result).toEqual({ success: true });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { Reflector } from '@nestjs/core';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { PERMISSIONS_KEY } from '../auth/permission.guard';
import { IsmsController } from './isms.controller';
import { IsmsService } from './isms.service';
import { IsmsContextService } from './isms-context.service';
import { IsmsContextIssueService } from './isms-context-issue.service';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock('../auth/hybrid-auth.guard', () => ({
  HybridAuthGuard: class MockHybridAuthGuard {},
}));
jest.mock('../auth/permission.guard', () => ({
  PermissionGuard: class MockPermissionGuard {},
  PERMISSIONS_KEY: 'permissions',
}));
jest.mock('@trycompai/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));
jest.mock('./isms.service', () => ({
  IsmsService: class MockIsmsService {},
}));
jest.mock('./isms-context.service', () => ({
  IsmsContextService: class MockIsmsContextService {},
}));
jest.mock('./isms-context-issue.service', () => ({
  IsmsContextIssueService: class MockIsmsContextIssueService {},
}));

describe('IsmsController', () => {
  let controller: IsmsController;

  const mockIsmsService = {
    ensureSetup: jest.fn(),
    getDocument: jest.fn(),
    submitForApproval: jest.fn(),
    approve: jest.fn(),
    decline: jest.fn(),
  };
  const mockContextService = {
    generate: jest.fn(),
    drift: jest.fn(),
    exportDocument: jest.fn(),
  };
  const mockContextIssueService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IsmsController],
      providers: [
        { provide: IsmsService, useValue: mockIsmsService },
        { provide: IsmsContextService, useValue: mockContextService },
        { provide: IsmsContextIssueService, useValue: mockContextIssueService },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<IsmsController>(IsmsController);
    jest.clearAllMocks();
  });

  it('ensureSetup passes dto to the service', async () => {
    mockIsmsService.ensureSetup.mockResolvedValue({ success: true });
    const dto = { organizationId: 'org_1', frameworkId: 'fw_1' };

    const result = await controller.ensureSetup(dto);

    expect(mockIsmsService.ensureSetup).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ success: true });
  });

  it('getDocument passes documentId and organizationId', async () => {
    mockIsmsService.getDocument.mockResolvedValue({ id: 'doc_1' });

    await controller.getDocument('doc_1', 'org_1');

    expect(mockIsmsService.getDocument).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
    });
  });

  it('generate delegates to the context service', async () => {
    mockContextService.generate.mockResolvedValue({ id: 'doc_1' });

    await controller.generate('doc_1', 'org_1');

    expect(mockContextService.generate).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
    });
  });

  it('createContextIssue passes documentId, dto and org', async () => {
    const dto = { kind: 'internal' as const, description: 'd', effect: 'e' };
    mockContextIssueService.create.mockResolvedValue({ id: 'issue_1' });

    await controller.createContextIssue('doc_1', dto, 'org_1');

    expect(mockContextIssueService.create).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto,
    });
  });

  it('updateContextIssue passes issueId, dto and org', async () => {
    const dto = { description: 'updated' };
    mockContextIssueService.update.mockResolvedValue({ id: 'issue_1' });

    await controller.updateContextIssue('issue_1', dto, 'org_1');

    expect(mockContextIssueService.update).toHaveBeenCalledWith({
      issueId: 'issue_1',
      organizationId: 'org_1',
      dto,
    });
  });

  it('deleteContextIssue passes issueId and org', async () => {
    mockContextIssueService.remove.mockResolvedValue({ success: true });

    await controller.deleteContextIssue('issue_1', 'org_1');

    expect(mockContextIssueService.remove).toHaveBeenCalledWith({
      issueId: 'issue_1',
      organizationId: 'org_1',
    });
  });

  it('submitForApproval passes documentId, dto and org', async () => {
    const dto = { approverId: 'mem_1' };
    mockIsmsService.submitForApproval.mockResolvedValue({ id: 'doc_1' });

    await controller.submitForApproval('doc_1', dto, 'org_1');

    expect(mockIsmsService.submitForApproval).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto,
    });
  });

  it('approve passes documentId, org and userId', async () => {
    mockIsmsService.approve.mockResolvedValue({ id: 'doc_1' });

    await controller.approve('doc_1', 'org_1', 'usr_1');

    expect(mockIsmsService.approve).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
      userId: 'usr_1',
    });
  });

  it('decline passes documentId and org', async () => {
    mockIsmsService.decline.mockResolvedValue({ id: 'doc_1' });

    await controller.decline('doc_1', 'org_1');

    expect(mockIsmsService.decline).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
    });
  });

  it('drift delegates to the context service', async () => {
    mockContextService.drift.mockResolvedValue({
      isStale: false,
      changedSources: [],
    });

    await controller.drift('doc_1', 'org_1');

    expect(mockContextService.drift).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
    });
  });

  it('exportDocument sets headers and sends the buffer', async () => {
    const fileBuffer = Buffer.from('pdf-data');
    mockContextService.exportDocument.mockResolvedValue({
      fileBuffer,
      mimeType: 'application/pdf',
      filename: 'context-of-the-organization-v1.pdf',
    });
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;
    const dto = { format: 'pdf' as const };

    await controller.exportDocument('doc_1', dto, 'org_1', res);

    expect(mockContextService.exportDocument).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto,
    });
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/pdf',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="context-of-the-organization-v1.pdf"',
    );
    expect(res.send).toHaveBeenCalledWith(fileBuffer);
  });

  describe('permission metadata', () => {
    const reflector = new Reflector();
    const permissionsFor = (method: keyof IsmsController) =>
      reflector.get(PERMISSIONS_KEY, IsmsController.prototype[method]);

    it('gates ensure-setup with audit:create', () => {
      expect(permissionsFor('ensureSetup')).toEqual([
        { resource: 'audit', actions: ['create'] },
      ]);
    });

    it('gates read endpoints with audit:read', () => {
      expect(permissionsFor('getDocument')).toEqual([
        { resource: 'audit', actions: ['read'] },
      ]);
      expect(permissionsFor('drift')).toEqual([
        { resource: 'audit', actions: ['read'] },
      ]);
      expect(permissionsFor('exportDocument')).toEqual([
        { resource: 'audit', actions: ['read'] },
      ]);
    });

    it('gates mutation endpoints with audit:update', () => {
      for (const method of [
        'generate',
        'createContextIssue',
        'updateContextIssue',
        'deleteContextIssue',
        'submitForApproval',
        'approve',
        'decline',
      ] as const) {
        expect(permissionsFor(method)).toEqual([
          { resource: 'audit', actions: ['update'] },
        ]);
      }
    });
  });
});

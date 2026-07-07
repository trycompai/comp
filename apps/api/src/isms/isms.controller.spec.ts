import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { resolveRolePermissions, permissionsGrant } from '../auth/app-access';
import { resolveServiceByName } from '../auth/service-token.config';
import type { AuthContext as AuthContextType } from '../auth/types';
import { IsmsController } from './isms.controller';
import { IsmsService } from './isms.service';
import { IsmsContextService } from './isms-context.service';
import { IsmsVersionService } from './isms-version.service';
import { IsmsDocumentControlService } from './isms-document-control.service';

const mockResolveRolePermissions = jest.mocked(resolveRolePermissions);
const mockPermissionsGrant = jest.mocked(permissionsGrant);
const mockResolveServiceByName = jest.mocked(resolveServiceByName);

/** Build a minimal session-auth AuthContext for ensure-setup tests. */
const sessionContext = (
  overrides: Partial<AuthContextType> = {},
): AuthContextType => ({
  organizationId: 'org_1',
  authType: 'session',
  isApiKey: false,
  isServiceToken: false,
  isPlatformAdmin: false,
  userRoles: ['auditor'],
  ...overrides,
});

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
jest.mock('../auth/app-access', () => ({
  resolveRolePermissions: jest.fn(),
  permissionsGrant: jest.fn(),
}));
jest.mock('../auth/service-token.config', () => ({
  resolveServiceByName: jest.fn(),
}));
jest.mock('./isms.service', () => ({
  IsmsService: class MockIsmsService {},
}));
jest.mock('./isms-context.service', () => ({
  IsmsContextService: class MockIsmsContextService {},
}));
jest.mock('./isms-version.service', () => ({
  IsmsVersionService: class MockIsmsVersionService {},
}));
jest.mock('./isms-document-control.service', () => ({
  IsmsDocumentControlService: class MockIsmsDocumentControlService {},
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
  const mockVersionService = {
    getVersions: jest.fn(),
  };
  const mockDocumentControlService = {
    addControls: jest.fn(),
    removeControl: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IsmsController],
      providers: [
        { provide: IsmsService, useValue: mockIsmsService },
        { provide: IsmsContextService, useValue: mockContextService },
        { provide: IsmsVersionService, useValue: mockVersionService },
        {
          provide: IsmsDocumentControlService,
          useValue: mockDocumentControlService,
        },
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

  it('ensureSetup derives the org from the session, not the body', async () => {
    mockIsmsService.ensureSetup.mockResolvedValue({ success: true });
    mockResolveRolePermissions.mockResolvedValue({ evidence: ['update'] });
    mockPermissionsGrant.mockReturnValue(true);

    const result = await controller.ensureSetup(
      { frameworkId: 'fw_1' },
      'org_1',
      sessionContext(),
    );

    expect(mockIsmsService.ensureSetup).toHaveBeenCalledWith({
      organizationId: 'org_1',
      frameworkId: 'fw_1',
      canWrite: true,
    });
    expect(result).toEqual({ success: true });
  });

  it('ensureSetup threads canWrite=true when the caller has evidence:update', async () => {
    mockIsmsService.ensureSetup.mockResolvedValue({ success: true });
    mockResolveRolePermissions.mockResolvedValue({ evidence: ['update'] });
    mockPermissionsGrant.mockReturnValue(true);

    await controller.ensureSetup({ frameworkId: 'fw_1' }, 'org_1', sessionContext());

    expect(mockResolveRolePermissions).toHaveBeenCalledWith('org_1', ['auditor']);
    expect(mockPermissionsGrant).toHaveBeenCalledWith(
      { evidence: ['update'] },
      'evidence',
      'update',
    );
    expect(mockIsmsService.ensureSetup).toHaveBeenCalledWith(
      expect.objectContaining({ canWrite: true }),
    );
  });

  it('ensureSetup threads canWrite=false for a read-only caller', async () => {
    mockIsmsService.ensureSetup.mockResolvedValue({ success: true });
    mockResolveRolePermissions.mockResolvedValue({ evidence: ['read'] });
    mockPermissionsGrant.mockReturnValue(false);

    await controller.ensureSetup({ frameworkId: 'fw_1' }, 'org_1', sessionContext());

    expect(mockIsmsService.ensureSetup).toHaveBeenCalledWith(
      expect.objectContaining({ canWrite: false }),
    );
  });

  it('ensureSetup grants canWrite to platform admins without resolving roles', async () => {
    mockIsmsService.ensureSetup.mockResolvedValue({ success: true });

    await controller.ensureSetup(
      { frameworkId: 'fw_1' },
      'org_1',
      sessionContext({ isPlatformAdmin: true }),
    );

    expect(mockResolveRolePermissions).not.toHaveBeenCalled();
    expect(mockIsmsService.ensureSetup).toHaveBeenCalledWith(
      expect.objectContaining({ canWrite: true }),
    );
  });

  it('ensureSetup resolves canWrite from API key scopes', async () => {
    mockIsmsService.ensureSetup.mockResolvedValue({ success: true });

    await controller.ensureSetup(
      { frameworkId: 'fw_1' },
      'org_1',
      sessionContext({
        authType: 'api-key',
        isApiKey: true,
        userRoles: null,
        apiKeyScopes: ['evidence:read'],
      }),
    );

    expect(mockResolveRolePermissions).not.toHaveBeenCalled();
    expect(mockIsmsService.ensureSetup).toHaveBeenCalledWith(
      expect.objectContaining({ canWrite: false }),
    );
  });

  it('ensureSetup resolves canWrite from service-token permissions', async () => {
    mockIsmsService.ensureSetup.mockResolvedValue({ success: true });
    mockResolveServiceByName.mockReturnValue({
      envVar: 'SERVICE_TOKEN_X',
      name: 'X',
      permissions: ['evidence:update'],
    });

    await controller.ensureSetup(
      { frameworkId: 'fw_1' },
      'org_1',
      sessionContext({
        authType: 'service',
        isServiceToken: true,
        serviceName: 'x',
        userRoles: null,
      }),
    );

    expect(mockIsmsService.ensureSetup).toHaveBeenCalledWith(
      expect.objectContaining({ canWrite: true }),
    );
  });

  it('getDocument passes documentId and organizationId', async () => {
    mockIsmsService.getDocument.mockResolvedValue({ id: 'doc_1' });

    await controller.getDocument('doc_1', 'org_1');

    expect(mockIsmsService.getDocument).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
    });
  });

  it('addControls passes documentId, controlIds and org', async () => {
    mockDocumentControlService.addControls.mockResolvedValue({
      message: 'Controls linked',
    });

    await controller.addControls('doc_1', { controlIds: ['ctl_1'] }, 'org_1');

    expect(mockDocumentControlService.addControls).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
      controlIds: ['ctl_1'],
    });
  });

  it('removeControl passes documentId, controlId and org', async () => {
    mockDocumentControlService.removeControl.mockResolvedValue({
      message: 'Control unlinked',
    });

    await controller.removeControl('doc_1', 'ctl_1', 'org_1');

    expect(mockDocumentControlService.removeControl).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
      controlId: 'ctl_1',
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

  it('decline passes documentId, org and userId', async () => {
    mockIsmsService.decline.mockResolvedValue({ id: 'doc_1' });

    await controller.decline('doc_1', 'org_1', 'usr_1');

    expect(mockIsmsService.decline).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
      userId: 'usr_1',
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

  it('getVersions delegates to the version service', async () => {
    mockVersionService.getVersions.mockResolvedValue({
      currentVersionId: 'isms_ver_1',
      versions: [],
    });

    await controller.getVersions('doc_1', 'org_1');

    expect(mockVersionService.getVersions).toHaveBeenCalledWith({
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
});

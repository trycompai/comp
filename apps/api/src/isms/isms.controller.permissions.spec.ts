import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../auth/permission.guard';
import { IsmsController } from './isms.controller';

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

describe('IsmsController permission metadata', () => {
  const reflector = new Reflector();
  const permissionsFor = (method: keyof IsmsController) =>
    reflector.get(PERMISSIONS_KEY, IsmsController.prototype[method]);

  it('gates ensure-setup with evidence:read', () => {
    expect(permissionsFor('ensureSetup')).toEqual([
      { resource: 'evidence', actions: ['read'] },
    ]);
  });

  it('gates read endpoints with evidence:read', () => {
    expect(permissionsFor('getDocument')).toEqual([
      { resource: 'evidence', actions: ['read'] },
    ]);
    expect(permissionsFor('drift')).toEqual([
      { resource: 'evidence', actions: ['read'] },
    ]);
    expect(permissionsFor('getVersions')).toEqual([
      { resource: 'evidence', actions: ['read'] },
    ]);
    expect(permissionsFor('exportDocument')).toEqual([
      { resource: 'evidence', actions: ['read'] },
    ]);
  });

  it('gates mutation endpoints with evidence:update', () => {
    for (const method of [
      'generate',
      'addControls',
      'removeControl',
      'submitForApproval',
      'approve',
      'decline',
    ] as const) {
      expect(permissionsFor(method)).toEqual([
        { resource: 'evidence', actions: ['update'] },
      ]);
    }
  });
});

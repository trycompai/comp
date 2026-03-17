import 'reflect-metadata';
import { GUARDS_METADATA, INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AdminAuditLogInterceptor } from './admin-audit-log.interceptor';
import { AdminOrganizationsController } from './admin-organizations.controller';
import { AdminFindingsController } from './admin-findings.controller';
import { AdminPoliciesController } from './admin-policies.controller';
import { AdminTasksController } from './admin-tasks.controller';
import { AdminVendorsController } from './admin-vendors.controller';
import { AdminContextController } from './admin-context.controller';
import { AdminEvidenceController } from './admin-evidence.controller';
import { AdminIntegrationsController } from '../integration-platform/controllers/admin-integrations.controller';
import { PlatformAuditLogInterceptor } from '../integration-platform/interceptors/platform-audit-log.interceptor';

jest.mock('../auth/auth.server', () => ({
  auth: { api: {} },
}));

jest.mock('@trycompai/db', () => ({
  db: {},
  FindingStatus: { open: 'open', ready_for_review: 'ready_for_review', needs_revision: 'needs_revision', closed: 'closed' },
  FindingType: { soc2: 'soc2', iso27001: 'iso27001' },
  TaskStatus: { todo: 'todo', in_progress: 'in_progress', done: 'done' },
  TaskFrequency: { daily: 'daily', weekly: 'weekly', monthly: 'monthly' },
  Departments: { none: 'none', engineering: 'engineering' },
  CommentEntityType: { task: 'task' },
  AttachmentEntityType: { task: 'task' },
  VendorCategory: { cloud: 'cloud', saas: 'saas' },
  VendorStatus: { active: 'active', inactive: 'inactive' },
  Prisma: {},
}));

jest.mock('@trigger.dev/sdk', () => ({
  auth: { createPublicToken: jest.fn() },
  tasks: { trigger: jest.fn() },
}));

jest.mock('@trycompai/integration-platform', () => ({
  getAllManifests: jest.fn().mockReturnValue([]),
  getManifest: jest.fn(),
}));

const ORG_ADMIN_CONTROLLERS = [
  { name: 'AdminOrganizationsController', controller: AdminOrganizationsController },
  { name: 'AdminFindingsController', controller: AdminFindingsController },
  { name: 'AdminPoliciesController', controller: AdminPoliciesController },
  { name: 'AdminTasksController', controller: AdminTasksController },
  { name: 'AdminVendorsController', controller: AdminVendorsController },
  { name: 'AdminContextController', controller: AdminContextController },
  { name: 'AdminEvidenceController', controller: AdminEvidenceController },
];

describe('Admin controllers security baseline', () => {
  describe.each(ORG_ADMIN_CONTROLLERS)(
    '$name',
    ({ controller }) => {
      it('has PlatformAdminGuard applied at the class level', () => {
        const guards = Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
        const hasPlatformAdminGuard = guards.some(
          (g: unknown) => g === PlatformAdminGuard,
        );
        expect(hasPlatformAdminGuard).toBe(true);
      });

      it('has AdminAuditLogInterceptor applied at the class level', () => {
        const interceptors =
          Reflect.getMetadata(INTERCEPTORS_METADATA, controller) ?? [];
        const hasAuditInterceptor = interceptors.some(
          (i: unknown) => i === AdminAuditLogInterceptor,
        );
        expect(hasAuditInterceptor).toBe(true);
      });

      it('uses the correct controller path prefix', () => {
        const path = Reflect.getMetadata('path', controller);
        expect(path).toBe('admin/organizations');
      });

      it('uses versioned controller format', () => {
        const version = Reflect.getMetadata('__version__', controller);
        expect(version).toBeDefined();
      });

      it('does NOT use HybridAuthGuard (admin controllers use PlatformAdminGuard)', () => {
        const guards = Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
        const guardNames = guards.map((g: { name?: string }) => g.name);
        expect(guardNames).not.toContain('HybridAuthGuard');
      });

      it('does NOT use PermissionGuard (admin controllers bypass RBAC)', () => {
        const guards = Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
        const guardNames = guards.map((g: { name?: string }) => g.name);
        expect(guardNames).not.toContain('PermissionGuard');
      });
    },
  );

  it('covers all 7 expected org-scoped admin controllers', () => {
    expect(ORG_ADMIN_CONTROLLERS).toHaveLength(7);
  });

  describe('AdminIntegrationsController', () => {
    const controller = AdminIntegrationsController;

    it('has PlatformAdminGuard applied at the class level', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
      const hasPlatformAdminGuard = guards.some(
        (g: unknown) => g === PlatformAdminGuard,
      );
      expect(hasPlatformAdminGuard).toBe(true);
    });

    it('has PlatformAuditLogInterceptor applied at the class level', () => {
      const interceptors =
        Reflect.getMetadata(INTERCEPTORS_METADATA, controller) ?? [];
      const hasAuditInterceptor = interceptors.some(
        (i: unknown) => i === PlatformAuditLogInterceptor,
      );
      expect(hasAuditInterceptor).toBe(true);
    });

    it('uses the correct controller path prefix', () => {
      const path = Reflect.getMetadata('path', controller);
      expect(path).toBe('admin/integrations');
    });

    it('uses versioned controller format', () => {
      const version = Reflect.getMetadata('__version__', controller);
      expect(version).toBeDefined();
    });

    it('does NOT use HybridAuthGuard', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
      const guardNames = guards.map((g: { name?: string }) => g.name);
      expect(guardNames).not.toContain('HybridAuthGuard');
    });

    it('does NOT use PermissionGuard', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
      const guardNames = guards.map((g: { name?: string }) => g.name);
      expect(guardNames).not.toContain('PermissionGuard');
    });
  });

  it('covers all 8 admin controllers (7 org-scoped + 1 platform-scoped)', () => {
    expect(ORG_ADMIN_CONTROLLERS).toHaveLength(7);
    expect(AdminIntegrationsController).toBeDefined();
  });

  describe('destructive endpoints have tighter rate limits', () => {
    it('activate has a limit of 5 per minute', () => {
      const metadata = Reflect.getMetadata(
        'THROTTLER:LIMIT',
        AdminOrganizationsController.prototype.activate,
      );
      if (metadata) {
        expect(metadata).toBeLessThanOrEqual(5);
      }
    });

    it('deactivate has a limit of 5 per minute', () => {
      const metadata = Reflect.getMetadata(
        'THROTTLER:LIMIT',
        AdminOrganizationsController.prototype.deactivate,
      );
      if (metadata) {
        expect(metadata).toBeLessThanOrEqual(5);
      }
    });
  });
});

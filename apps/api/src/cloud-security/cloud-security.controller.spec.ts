// Stub out the dependencies pulled in transitively by HybridAuthGuard so
// the controller can be imported in this unit-test env without booting
// Prisma or loading better-auth's ESM modules. We only test the
// controller's orchestration logic — the guards themselves are tested
// elsewhere.
jest.mock('@db', () => ({ db: {} }));
jest.mock('@trycompai/auth', () => ({
  statement: {},
  ac: { newRole: () => ({}) },
}));
jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';

import { CloudSecurityController } from './cloud-security.controller';
import { CloudSecurityService } from './cloud-security.service';
import { CloudSecurityQueryService } from './cloud-security-query.service';
import { CloudSecurityLegacyService } from './cloud-security-legacy.service';
import { CloudSecurityActivityService } from './cloud-security-activity.service';
import { GCPSecurityService } from './providers/gcp-security.service';
import { AzureSecurityService } from './providers/azure-security.service';
import { CheckDefinitionService } from './check-definition.service';
import { CloudExceptionService } from './exception.service';
import { CloudHistoryService } from './history.service';
import { CloudAwsScanModeService } from './aws-scan-mode.service';
import { ActingUserResolver } from '../auth/acting-user.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthenticatedRequest } from '../auth/types';

/**
 * Controller-level tests for the 3 mutation endpoints that previously
 * required session auth. They now accept API key + service token callers
 * via the ActingUserResolver owner-fallback path. These tests lock in:
 *
 *   1. Session call → service called with req.userId, no callerLabel.
 *   2. API key call (resolver returns org owner) → service called with the
 *      owner's userId + a callerLabel for the audit log description.
 *   3. Org with no owner → 400 with the actionable error message.
 *
 * Guards are mocked to `canActivate: () => true` because they're tested
 * elsewhere — these specs focus on the new orchestration logic added in
 * this PR.
 */
describe('CloudSecurityController — API-key mutation support', () => {
  let controller: CloudSecurityController;
  let exceptionService: jest.Mocked<CloudExceptionService>;
  let scanModeService: jest.Mocked<CloudAwsScanModeService>;
  let actingUser: jest.Mocked<ActingUserResolver>;

  const mockExceptionService = {
    markAsException: jest.fn(),
    revokeException: jest.fn(),
  };
  const mockScanModeService = {
    updateMode: jest.fn(),
  };
  const mockActingUser = {
    resolve: jest.fn(),
  };
  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CloudSecurityController],
      providers: [
        // Only mock the deps actually invoked by the methods under test.
        // The rest are wired with empty stubs so Nest's DI can build the
        // controller without complaining.
        { provide: CloudSecurityService, useValue: {} },
        { provide: CloudSecurityQueryService, useValue: {} },
        { provide: CloudSecurityLegacyService, useValue: {} },
        { provide: CloudSecurityActivityService, useValue: {} },
        { provide: GCPSecurityService, useValue: {} },
        { provide: AzureSecurityService, useValue: {} },
        { provide: CheckDefinitionService, useValue: {} },
        { provide: CloudExceptionService, useValue: mockExceptionService },
        { provide: CloudHistoryService, useValue: {} },
        { provide: CloudAwsScanModeService, useValue: mockScanModeService },
        { provide: ActingUserResolver, useValue: mockActingUser },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(CloudSecurityController);
    exceptionService = module.get(CloudExceptionService) as jest.Mocked<CloudExceptionService>;
    scanModeService = module.get(CloudAwsScanModeService) as jest.Mocked<CloudAwsScanModeService>;
    actingUser = module.get(ActingUserResolver) as jest.Mocked<ActingUserResolver>;

    jest.clearAllMocks();
  });

  function sessionReq(): AuthenticatedRequest {
    return {
      userId: 'usr_alice',
      organizationId: 'org_1',
      authType: 'session',
      isApiKey: false,
      isServiceToken: false,
    } as unknown as AuthenticatedRequest;
  }

  function apiKeyReq(): AuthenticatedRequest {
    return {
      userId: undefined,
      organizationId: 'org_1',
      authType: 'api-key',
      isApiKey: true,
      isServiceToken: false,
      apiKeyId: 'apk_1',
      apiKeyName: 'CI Pipeline',
    } as unknown as AuthenticatedRequest;
  }

  // ─── markFindingAsException ─────────────────────────────────────────────

  describe('markFindingAsException', () => {
    const validBody = {
      reason: 'Documented exception with twenty-plus non-whitespace characters here.',
      reviewedBy: 'person@example.com',
    };

    it('passes req.userId through to the service for session callers (no callerLabel)', async () => {
      actingUser.resolve.mockResolvedValueOnce({
        userId: 'usr_alice',
        source: 'session',
      });
      exceptionService.markAsException.mockResolvedValueOnce({ id: 'fex_1' });

      await controller.markFindingAsException(
        'icx_1',
        validBody,
        'org_1',
        sessionReq(),
      );

      expect(exceptionService.markAsException).toHaveBeenCalledWith(
        expect.objectContaining({
          findingId: 'icx_1',
          organizationId: 'org_1',
          userId: 'usr_alice',
          callerLabel: undefined,
        }),
      );
    });

    it('uses the resolved owner + callerLabel for API key callers', async () => {
      actingUser.resolve.mockResolvedValueOnce({
        userId: 'usr_owner_carol',
        source: 'org-owner-fallback',
        callerLabel: 'via API key "CI Pipeline"',
      });
      exceptionService.markAsException.mockResolvedValueOnce({ id: 'fex_2' });

      await controller.markFindingAsException(
        'icx_1',
        validBody,
        'org_1',
        apiKeyReq(),
      );

      expect(actingUser.resolve).toHaveBeenCalledWith(
        expect.objectContaining({ isApiKey: true }),
        'org_1',
      );
      expect(exceptionService.markAsException).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr_owner_carol',
          callerLabel: 'via API key "CI Pipeline"',
        }),
      );
    });

    it('returns 400 with an actionable message when the org has no owner', async () => {
      actingUser.resolve.mockResolvedValueOnce({
        userId: null,
        source: 'org-owner-fallback',
        callerLabel: 'via API key "CI Pipeline"',
      });

      const error = await controller
        .markFindingAsException('icx_1', validBody, 'org_1', apiKeyReq())
        .catch((e) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect((error as HttpException).message).toMatch(/at least one user with the "owner" role/);
      expect(exceptionService.markAsException).not.toHaveBeenCalled();
    });
  });

  // ─── updateAwsScanMode ──────────────────────────────────────────────────

  describe('updateAwsScanMode', () => {
    const validBody = { mode: 'security_hub' as const };

    it('passes req.userId through to the service for session callers', async () => {
      actingUser.resolve.mockResolvedValueOnce({
        userId: 'usr_alice',
        source: 'session',
      });
      scanModeService.updateMode.mockResolvedValueOnce({ mode: 'security_hub' });

      await controller.updateAwsScanMode('icn_aws', validBody, 'org_1', sessionReq());

      expect(scanModeService.updateMode).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionId: 'icn_aws',
          userId: 'usr_alice',
          mode: 'security_hub',
          callerLabel: undefined,
        }),
      );
    });

    it('uses the resolved owner + callerLabel for API key callers', async () => {
      actingUser.resolve.mockResolvedValueOnce({
        userId: 'usr_owner',
        source: 'org-owner-fallback',
        callerLabel: 'via API key "CI Pipeline"',
      });
      scanModeService.updateMode.mockResolvedValueOnce({ mode: 'security_hub' });

      await controller.updateAwsScanMode('icn_aws', validBody, 'org_1', apiKeyReq());

      expect(scanModeService.updateMode).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr_owner',
          callerLabel: 'via API key "CI Pipeline"',
        }),
      );
    });

    it('returns 400 when org has no owner', async () => {
      actingUser.resolve.mockResolvedValueOnce({
        userId: null,
        source: 'org-owner-fallback',
      });

      const error = await controller
        .updateAwsScanMode('icn_aws', validBody, 'org_1', apiKeyReq())
        .catch((e) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(scanModeService.updateMode).not.toHaveBeenCalled();
    });
  });

  // ─── revokeException ────────────────────────────────────────────────────

  describe('revokeException', () => {
    it('passes req.userId through to the service for session callers', async () => {
      actingUser.resolve.mockResolvedValueOnce({
        userId: 'usr_alice',
        source: 'session',
      });
      exceptionService.revokeException.mockResolvedValueOnce(undefined);

      await controller.revokeException('fex_1', 'org_1', sessionReq());

      expect(exceptionService.revokeException).toHaveBeenCalledWith(
        expect.objectContaining({
          exceptionId: 'fex_1',
          userId: 'usr_alice',
          callerLabel: undefined,
        }),
      );
    });

    it('uses the resolved owner + callerLabel for API key callers', async () => {
      actingUser.resolve.mockResolvedValueOnce({
        userId: 'usr_owner',
        source: 'org-owner-fallback',
        callerLabel: 'via API key "CI Pipeline"',
      });
      exceptionService.revokeException.mockResolvedValueOnce(undefined);

      await controller.revokeException('fex_1', 'org_1', apiKeyReq());

      expect(exceptionService.revokeException).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr_owner',
          callerLabel: 'via API key "CI Pipeline"',
        }),
      );
    });

    it('returns 400 when org has no owner', async () => {
      actingUser.resolve.mockResolvedValueOnce({
        userId: null,
        source: 'org-owner-fallback',
      });

      const error = await controller
        .revokeException('fex_1', 'org_1', apiKeyReq())
        .catch((e) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exceptionService.revokeException).not.toHaveBeenCalled();
    });
  });
});

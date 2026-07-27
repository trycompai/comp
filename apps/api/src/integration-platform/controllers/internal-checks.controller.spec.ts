import { Test, TestingModule } from '@nestjs/testing';
import { InternalChecksController } from './internal-checks.controller';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { ServiceTokenOnlyGuard } from '../../auth/service-token-only.guard';
import { ConnectionCheckRunnerService } from '../services/connection-check-runner.service';

jest.mock('@db', () => ({ db: {} }));
jest.mock('../../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock('@trycompai/auth', () => ({
  statement: { integration: ['create', 'read', 'update', 'delete'] },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('InternalChecksController', () => {
  let controller: InternalChecksController;
  const mockRunner = { runChecks: jest.fn() };
  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalChecksController],
      providers: [
        { provide: ConnectionCheckRunnerService, useValue: mockRunner },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(ServiceTokenOnlyGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(InternalChecksController);
    jest.clearAllMocks();
  });

  it('delegates to the runner with the connection, org and checkId', async () => {
    const runResult = { results: [], totalFindings: 0, totalPassing: 0 };
    mockRunner.runChecks.mockResolvedValue(runResult);

    const result = await controller.runConnectionChecks('conn_1', 'org_1', {
      checkId: 'aws-s3-public-access',
    });

    expect(mockRunner.runChecks).toHaveBeenCalledWith({
      connectionId: 'conn_1',
      organizationId: 'org_1',
      checkId: 'aws-s3-public-access',
    });
    expect(result).toBe(runResult);
  });

  it('passes checkId undefined when omitted (run all)', async () => {
    mockRunner.runChecks.mockResolvedValue({});
    await controller.runConnectionChecks('conn_1', 'org_1', {});
    expect(mockRunner.runChecks).toHaveBeenCalledWith({
      connectionId: 'conn_1',
      organizationId: 'org_1',
      checkId: undefined,
    });
  });
});

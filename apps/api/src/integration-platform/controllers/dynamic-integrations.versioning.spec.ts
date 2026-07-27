import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { DynamicIntegrationsController } from './dynamic-integrations.controller';
import { InternalTokenGuard } from '../../auth/internal-token.guard';
import { DynamicIntegrationRepository } from '../repositories/dynamic-integration.repository';
import { DynamicCheckRepository } from '../repositories/dynamic-check.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { CheckRunRepository } from '../repositories/check-run.repository';
import { DynamicManifestLoaderService } from '../services/dynamic-manifest-loader.service';

jest.mock('@db', () => ({ db: {} }));
jest.mock('@trycompai/integration-platform', () => ({
  validateIntegrationDefinition: jest.fn(),
  SyncDefinitionSchema: { parse: jest.fn() },
}));

describe('DynamicIntegrationsController — check versioning', () => {
  let controller: DynamicIntegrationsController;

  const INTEGRATION_ID = 'din_abc';
  const CHECK_ID = 'dck_abc';

  const oldCheck = {
    id: CHECK_ID,
    integrationId: INTEGRATION_ID,
    definition: { steps: [{ type: 'code', code: 'OLD' }] },
    variables: [{ key: 'region' }],
  };

  const dynamicCheckRepo = {
    findById: jest.fn(),
    update: jest.fn(),
    recordVersion: jest.fn(),
    listVersions: jest.fn(),
    findVersionById: jest.fn(),
  };
  const loaderService = { invalidateCache: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    dynamicCheckRepo.findById.mockResolvedValue(oldCheck);
    dynamicCheckRepo.update.mockResolvedValue(oldCheck);
    dynamicCheckRepo.recordVersion.mockResolvedValue({ id: 'dckv_1' });
    loaderService.invalidateCache.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DynamicIntegrationsController],
      providers: [
        { provide: DynamicIntegrationRepository, useValue: {} },
        { provide: DynamicCheckRepository, useValue: dynamicCheckRepo },
        { provide: ProviderRepository, useValue: {} },
        { provide: CheckRunRepository, useValue: {} },
        { provide: DynamicManifestLoaderService, useValue: loaderService },
      ],
    })
      .overrideGuard(InternalTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(DynamicIntegrationsController);
  });

  describe('updateCheck', () => {
    it('snapshots the OLD logic before applying the update', async () => {
      await controller.updateCheck(INTEGRATION_ID, CHECK_ID, {
        definition: { steps: [{ type: 'code', code: 'NEW' }] },
        source: 'agent',
        note: 'fix project-scoped keys',
      });

      // version captured the pre-change definition/variables
      expect(dynamicCheckRepo.recordVersion).toHaveBeenCalledWith({
        checkId: CHECK_ID,
        definition: oldCheck.definition,
        variables: oldCheck.variables,
        source: 'agent',
        note: 'fix project-scoped keys',
      });
      // version recorded BEFORE the update
      const verOrder =
        dynamicCheckRepo.recordVersion.mock.invocationCallOrder[0];
      const updOrder = dynamicCheckRepo.update.mock.invocationCallOrder[0];
      expect(verOrder).toBeLessThan(updOrder);
    });

    it('strips source/note from the data forwarded to the check update', async () => {
      await controller.updateCheck(INTEGRATION_ID, CHECK_ID, {
        definition: { steps: [] },
        source: 'agent',
        note: 'x',
      });
      expect(dynamicCheckRepo.update).toHaveBeenCalledWith(CHECK_ID, {
        definition: { steps: [] },
      });
    });

    it('still applies the update if versioning fails (best-effort)', async () => {
      dynamicCheckRepo.recordVersion.mockRejectedValueOnce(new Error('boom'));
      const res = await controller.updateCheck(INTEGRATION_ID, CHECK_ID, {
        definition: { steps: [] },
      });
      expect(res).toEqual({ success: true });
      expect(dynamicCheckRepo.update).toHaveBeenCalled();
    });

    it('404s when the check does not belong to the integration', async () => {
      dynamicCheckRepo.findById.mockResolvedValueOnce({
        ...oldCheck,
        integrationId: 'din_other',
      });
      await expect(
        controller.updateCheck(INTEGRATION_ID, CHECK_ID, {}),
      ).rejects.toBeInstanceOf(HttpException);
      expect(dynamicCheckRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('restoreCheckVersion', () => {
    const version = {
      id: 'dckv_1',
      checkId: CHECK_ID,
      definition: { steps: [{ type: 'code', code: 'RESTORED' }] },
      variables: [],
    };

    it('snapshots current state, then restores the version logic', async () => {
      dynamicCheckRepo.findVersionById.mockResolvedValue(version);

      const res = await controller.restoreCheckVersion(
        INTEGRATION_ID,
        CHECK_ID,
        'dckv_1',
      );

      expect(dynamicCheckRepo.recordVersion).toHaveBeenCalledWith(
        expect.objectContaining({ checkId: CHECK_ID, source: 'restore' }),
      );
      expect(dynamicCheckRepo.update).toHaveBeenCalledWith(CHECK_ID, {
        definition: version.definition,
        variables: version.variables,
      });
      expect(res).toEqual({ success: true, restoredFrom: 'dckv_1' });
    });

    it('404s when the version belongs to a different check', async () => {
      dynamicCheckRepo.findVersionById.mockResolvedValue({
        ...version,
        checkId: 'dck_other',
      });
      await expect(
        controller.restoreCheckVersion(INTEGRATION_ID, CHECK_ID, 'dckv_1'),
      ).rejects.toBeInstanceOf(HttpException);
      expect(dynamicCheckRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('listCheckVersions', () => {
    it('returns the version history for the check', async () => {
      dynamicCheckRepo.listVersions.mockResolvedValue([{ id: 'dckv_1' }]);
      const res = await controller.listCheckVersions(INTEGRATION_ID, CHECK_ID);
      expect(res).toEqual({ versions: [{ id: 'dckv_1' }] });
    });
  });
});

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import {
  PermissionGuard,
  PERMISSIONS_KEY,
} from '../../auth/permission.guard';
import { IsmsProfileController } from './isms-profile.controller';
import { IsmsProfileService } from './isms-profile.service';

jest.mock('../../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock('../../auth/hybrid-auth.guard', () => ({
  HybridAuthGuard: class MockHybridAuthGuard {},
}));
jest.mock('../../auth/permission.guard', () => ({
  PermissionGuard: class MockPermissionGuard {},
  PERMISSIONS_KEY: 'permissions',
}));
jest.mock('@trycompai/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));
jest.mock('./isms-profile.service', () => ({
  IsmsProfileService: class MockIsmsProfileService {},
}));

const reqWith = (body: unknown): Request => ({ body }) as unknown as Request;

describe('IsmsProfileController', () => {
  let controller: IsmsProfileController;

  const mockService = {
    getProfile: jest.fn(),
    saveProfile: jest.fn(),
    generateAll: jest.fn(),
  };
  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IsmsProfileController],
      providers: [{ provide: IsmsProfileService, useValue: mockService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<IsmsProfileController>(IsmsProfileController);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('requires a frameworkId', async () => {
      await expect(
        controller.getProfile('', 'org_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('delegates to the service with framework + org', async () => {
      mockService.getProfile.mockResolvedValue({ answers: null });
      await controller.getProfile('fw_1', 'org_1');
      expect(mockService.getProfile).toHaveBeenCalledWith({
        organizationId: 'org_1',
        frameworkId: 'fw_1',
      });
    });
  });

  describe('saveProfile', () => {
    it('validates the body and delegates', async () => {
      mockService.saveProfile.mockResolvedValue({ id: 'pf_1' });
      await controller.saveProfile(
        reqWith({
          frameworkId: 'fw_1',
          answers: { hasContractors: true },
          complete: false,
        }),
        'org_1',
      );
      expect(mockService.saveProfile).toHaveBeenCalledWith({
        organizationId: 'org_1',
        frameworkId: 'fw_1',
        answers: { hasContractors: true },
        complete: false,
      });
    });

    it('defaults complete to false when omitted', async () => {
      mockService.saveProfile.mockResolvedValue({ id: 'pf_1' });
      await controller.saveProfile(
        reqWith({ frameworkId: 'fw_1', answers: {} }),
        'org_1',
      );
      expect(mockService.saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({ complete: false }),
      );
    });

    it('rejects an invalid body with BadRequestException', async () => {
      await expect(
        controller.saveProfile(reqWith({ answers: {} }), 'org_1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockService.saveProfile).not.toHaveBeenCalled();
    });
  });

  describe('generateAll', () => {
    it('delegates to the service with framework + org', async () => {
      mockService.generateAll.mockResolvedValue({ success: true });
      await controller.generateAll({ frameworkId: 'fw_1' }, 'org_1');
      expect(mockService.generateAll).toHaveBeenCalledWith({
        organizationId: 'org_1',
        frameworkId: 'fw_1',
      });
    });
  });

  describe('permission metadata', () => {
    const reflector = new Reflector();
    const permissionsFor = (method: keyof IsmsProfileController) =>
      reflector.get(PERMISSIONS_KEY, IsmsProfileController.prototype[method]);

    it('gates getProfile with evidence:read', () => {
      expect(permissionsFor('getProfile')).toEqual([
        { resource: 'evidence', actions: ['read'] },
      ]);
    });

    it('gates saveProfile and generateAll with evidence:update', () => {
      for (const method of ['saveProfile', 'generateAll'] as const) {
        expect(permissionsFor(method)).toEqual([
          { resource: 'evidence', actions: ['update'] },
        ]);
      }
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { PERMISSIONS_KEY } from '../auth/permission.guard';
import { IsmsRegistersController } from './isms-registers.controller';
import { IsmsInterestedPartyService } from './isms-interested-party.service';
import { IsmsRequirementService } from './isms-requirement.service';
import { IsmsObjectiveService } from './isms-objective.service';
import { IsmsNarrativeService } from './isms-narrative.service';

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
jest.mock('./isms-interested-party.service', () => ({
  IsmsInterestedPartyService: class {},
}));
jest.mock('./isms-requirement.service', () => ({
  IsmsRequirementService: class {},
}));
jest.mock('./isms-objective.service', () => ({
  IsmsObjectiveService: class {},
}));
jest.mock('./isms-narrative.service', () => ({
  IsmsNarrativeService: class {},
}));

describe('IsmsRegistersController', () => {
  let controller: IsmsRegistersController;

  const interestedPartyService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const requirementService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const objectiveService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const narrativeService = { save: jest.fn() };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IsmsRegistersController],
      providers: [
        {
          provide: IsmsInterestedPartyService,
          useValue: interestedPartyService,
        },
        { provide: IsmsRequirementService, useValue: requirementService },
        { provide: IsmsObjectiveService, useValue: objectiveService },
        { provide: IsmsNarrativeService, useValue: narrativeService },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<IsmsRegistersController>(IsmsRegistersController);
    jest.clearAllMocks();
  });

  it('createInterestedParty passes documentId, dto, org', async () => {
    const dto = {
      name: 'Customers',
      category: 'Customer',
      needsExpectations: 'n',
    };
    await controller.createInterestedParty('doc_1', dto, 'org_1');
    expect(interestedPartyService.create).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto,
    });
  });

  it('updateInterestedParty passes partyId, dto, org', async () => {
    const dto = { name: 'X' };
    await controller.updateInterestedParty('ip_1', dto, 'org_1');
    expect(interestedPartyService.update).toHaveBeenCalledWith({
      partyId: 'ip_1',
      organizationId: 'org_1',
      dto,
    });
  });

  it('deleteInterestedParty passes partyId, org', async () => {
    await controller.deleteInterestedParty('ip_1', 'org_1');
    expect(interestedPartyService.remove).toHaveBeenCalledWith({
      partyId: 'ip_1',
      organizationId: 'org_1',
    });
  });

  it('createRequirement passes documentId, dto, org', async () => {
    const dto = { partyName: 'C', requirement: 'r', treatment: 't' };
    await controller.createRequirement('doc_1', dto, 'org_1');
    expect(requirementService.create).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto,
    });
  });

  it('createObjective passes documentId, dto, org', async () => {
    const dto = { objective: 'o' };
    await controller.createObjective('doc_1', dto, 'org_1');
    expect(objectiveService.create).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto,
    });
  });

  it('updateObjective passes objectiveId, dto, org', async () => {
    const dto = { status: 'met' as const };
    await controller.updateObjective('obj_1', dto, 'org_1');
    expect(objectiveService.update).toHaveBeenCalledWith({
      objectiveId: 'obj_1',
      organizationId: 'org_1',
      dto,
    });
  });

  it('saveNarrative reads req.body.narrative and passes it through', async () => {
    const req = {
      body: { narrative: { statement: 's' } },
    } as unknown as Request;
    await controller.saveNarrative('doc_1', req, 'org_1');
    expect(narrativeService.save).toHaveBeenCalledWith({
      documentId: 'doc_1',
      organizationId: 'org_1',
      narrative: { statement: 's' },
    });
  });

  describe('permission metadata', () => {
    const reflector = new Reflector();
    const permissionsFor = (method: keyof IsmsRegistersController) =>
      reflector.get(PERMISSIONS_KEY, IsmsRegistersController.prototype[method]);

    it('gates every mutation with evidence:update', () => {
      for (const method of [
        'createInterestedParty',
        'updateInterestedParty',
        'deleteInterestedParty',
        'createRequirement',
        'updateRequirement',
        'deleteRequirement',
        'createObjective',
        'updateObjective',
        'deleteObjective',
        'saveNarrative',
      ] as const) {
        expect(permissionsFor(method)).toEqual([
          { resource: 'evidence', actions: ['update'] },
        ]);
      }
    });
  });
});

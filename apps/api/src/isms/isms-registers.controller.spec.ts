import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { PERMISSIONS_KEY } from '../auth/permission.guard';
import { IsmsRegistersController } from './isms-registers.controller';
import { IsmsContextIssueService } from './isms-context-issue.service';
import { IsmsInterestedPartyService } from './isms-interested-party.service';
import { IsmsRequirementService } from './isms-requirement.service';
import { IsmsObjectiveService } from './isms-objective.service';
import { IsmsRoleService } from './isms-role.service';
import { IsmsRoleAssignmentService } from './isms-role-assignment.service';
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
jest.mock('./isms-context-issue.service', () => ({
  IsmsContextIssueService: class {},
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
jest.mock('./isms-role.service', () => ({
  IsmsRoleService: class {},
}));
jest.mock('./isms-role-assignment.service', () => ({
  IsmsRoleAssignmentService: class {},
}));
jest.mock('./isms-narrative.service', () => ({
  IsmsNarrativeService: class {},
}));

const reqWith = (body: Record<string, unknown>) =>
  ({ body }) as unknown as Request;

describe('IsmsRegistersController', () => {
  let controller: IsmsRegistersController;

  const contextIssueService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
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
  const roleService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const roleAssignmentService = {
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
        { provide: IsmsContextIssueService, useValue: contextIssueService },
        {
          provide: IsmsInterestedPartyService,
          useValue: interestedPartyService,
        },
        { provide: IsmsRequirementService, useValue: requirementService },
        { provide: IsmsObjectiveService, useValue: objectiveService },
        { provide: IsmsRoleService, useValue: roleService },
        { provide: IsmsRoleAssignmentService, useValue: roleAssignmentService },
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

  describe('createRow', () => {
    it('dispatches interested-parties create with documentId, parsed dto, org', async () => {
      const dto = {
        name: 'Customers',
        category: 'Customer',
        needsExpectations: 'n',
      };
      await controller.createRow(
        'doc_1',
        'interested-parties',
        reqWith(dto),
        'org_1',
      );
      expect(interestedPartyService.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto,
      });
    });

    it('dispatches context-issues create and passes category through', async () => {
      const body = {
        kind: 'internal',
        category: 'Strategic',
        description: 'd',
        effect: 'e',
      };
      await controller.createRow(
        'doc_1',
        'context-issues',
        reqWith(body),
        'org_1',
      );
      expect(contextIssueService.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: body,
      });
    });

    it('dispatches requirements create with parsed dto', async () => {
      const body = { partyName: 'C', requirement: 'r', treatment: 't' };
      await controller.createRow(
        'doc_1',
        'requirements',
        reqWith(body),
        'org_1',
      );
      expect(requirementService.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: body,
      });
    });

    it('dispatches objectives create with parsed dto', async () => {
      const body = { objective: 'o' };
      await controller.createRow('doc_1', 'objectives', reqWith(body), 'org_1');
      expect(objectiveService.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: body,
      });
    });

    it('throws BadRequestException for an unknown register', async () => {
      await expect(
        controller.createRow('doc_1', 'nope', reqWith({}), 'org_1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateRow', () => {
    it('dispatches context-issues update with issueId, parsed dto, org', async () => {
      const body = { description: 'updated' };
      await controller.updateRow(
        'context-issues',
        'row1',
        reqWith(body),
        'org_1',
      );
      expect(contextIssueService.update).toHaveBeenCalledWith({
        issueId: 'row1',
        organizationId: 'org_1',
        dto: body,
      });
    });

    it('dispatches interested-parties update with partyId', async () => {
      const body = { name: 'X' };
      await controller.updateRow(
        'interested-parties',
        'ip_1',
        reqWith(body),
        'org_1',
      );
      expect(interestedPartyService.update).toHaveBeenCalledWith({
        partyId: 'ip_1',
        organizationId: 'org_1',
        dto: body,
      });
    });

    it('throws BadRequestException for an unknown register', async () => {
      await expect(
        controller.updateRow('nope', 'row1', reqWith({}), 'org_1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('deleteRow', () => {
    it('dispatches objectives remove with objectiveId and org', async () => {
      await controller.deleteRow('objectives', 'row1', 'org_1');
      expect(objectiveService.remove).toHaveBeenCalledWith({
        objectiveId: 'row1',
        organizationId: 'org_1',
      });
    });

    it('dispatches requirements remove with requirementId and org', async () => {
      await controller.deleteRow('requirements', 'req_1', 'org_1');
      expect(requirementService.remove).toHaveBeenCalledWith({
        requirementId: 'req_1',
        organizationId: 'org_1',
      });
    });

    it('throws BadRequestException for an unknown register', async () => {
      await expect(
        controller.deleteRow('nope', 'row1', 'org_1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('saveNarrative reads req.body.narrative and passes it through', async () => {
    await controller.saveNarrative(
      'doc_1',
      reqWith({ narrative: { statement: 's' } }),
      'org_1',
    );
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
        'createRow',
        'updateRow',
        'deleteRow',
        'saveNarrative',
      ] as const) {
        expect(permissionsFor(method)).toEqual([
          { resource: 'evidence', actions: ['update'] },
        ]);
      }
    });
  });
});

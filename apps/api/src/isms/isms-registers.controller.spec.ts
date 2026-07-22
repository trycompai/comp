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
import { IsmsMetricService } from './isms-metric.service';
import { IsmsMeasurementService } from './isms-measurement.service';
import { IsmsAuditService } from './isms-audit.service';
import { IsmsAuditControlService } from './isms-audit-control.service';
import { IsmsAuditFindingService } from './isms-audit-finding.service';
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
jest.mock('./isms-metric.service', () => ({
  IsmsMetricService: class {},
}));
jest.mock('./isms-measurement.service', () => ({
  IsmsMeasurementService: class {},
}));
jest.mock('./isms-audit.service', () => ({
  IsmsAuditService: class {},
}));
jest.mock('./isms-audit-control.service', () => ({
  IsmsAuditControlService: class {},
}));
jest.mock('./isms-audit-finding.service', () => ({
  IsmsAuditFindingService: class {},
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
  const metricService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const measurementService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    bulkCreate: jest.fn(),
  };
  const auditService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const auditControlService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const auditFindingService = {
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
        { provide: IsmsMetricService, useValue: metricService },
        { provide: IsmsMeasurementService, useValue: measurementService },
        { provide: IsmsAuditService, useValue: auditService },
        { provide: IsmsAuditControlService, useValue: auditControlService },
        { provide: IsmsAuditFindingService, useValue: auditFindingService },
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
        undefined,
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
        undefined,
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
        undefined,
      );
      expect(requirementService.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: body,
      });
    });

    it('dispatches objectives create with parsed dto', async () => {
      const body = { objective: 'o' };
      await controller.createRow(
        'doc_1',
        'objectives',
        reqWith(body),
        'org_1',
        undefined,
      );
      expect(objectiveService.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: body,
      });
    });

    it('dispatches metrics create without forwarding the member id', async () => {
      const body = { name: 'Custom metric', cadence: 'monthly' };
      await controller.createRow(
        'doc_1',
        'metrics',
        reqWith(body),
        'org_1',
        'mem_1',
      );
      expect(metricService.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: body,
      });
    });

    it('dispatches measurements create with the caller member id as enteredBy', async () => {
      const body = { metricId: 'met_1', periodStart: '2026-07-01', value: '5' };
      await controller.createRow(
        'doc_1',
        'measurements',
        reqWith(body),
        'org_1',
        'mem_1',
      );
      expect(measurementService.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        memberId: 'mem_1',
        dto: body,
      });
    });

    it('passes memberId null under API-key auth (no session member)', async () => {
      const body = { metricId: 'met_1', periodStart: '2026-07-01', value: '5' };
      await controller.createRow(
        'doc_1',
        'measurements',
        reqWith(body),
        'org_1',
        undefined,
      );
      expect(measurementService.create).toHaveBeenCalledWith(
        expect.objectContaining({ memberId: null }),
      );
    });

    it('dispatches audits create with an empty body (defaults server-side)', async () => {
      await controller.createRow(
        'doc_1',
        'audits',
        reqWith({}),
        'org_1',
        'mem_1',
      );
      expect(auditService.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: {},
      });
    });

    it('dispatches audit-controls and audit-findings create with parsed dtos', async () => {
      const controlBody = { auditId: 'aud_1', controlRef: 'A.8.16' };
      await controller.createRow(
        'doc_1',
        'audit-controls',
        reqWith(controlBody),
        'org_1',
        'mem_1',
      );
      expect(auditControlService.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: controlBody,
      });

      const findingBody = {
        auditId: 'aud_1',
        type: 'observation',
        description: 'No restore test evidenced.',
      };
      await controller.createRow(
        'doc_1',
        'audit-findings',
        reqWith(findingBody),
        'org_1',
        'mem_1',
      );
      expect(auditFindingService.create).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        dto: findingBody,
      });
    });

    it('rejects an audit-findings create without a description', async () => {
      await expect(
        controller.createRow(
          'doc_1',
          'audit-findings',
          reqWith({ auditId: 'aud_1', type: 'ofi' }),
          'org_1',
          'mem_1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(auditFindingService.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for an unknown register', async () => {
      await expect(
        controller.createRow('doc_1', 'nope', reqWith({}), 'org_1', undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('bulkCreateMeasurements', () => {
    it('parses the body and dispatches to the measurement service', async () => {
      const measurements = [
        { metricId: 'met_1', periodStart: '2026-07-01', value: '99.9%' },
        { metricId: 'met_2', periodStart: '2026-04-01', value: '0', note: 'n' },
      ];
      await controller.bulkCreateMeasurements(
        'doc_1',
        reqWith({ measurements }),
        'org_1',
        'mem_1',
      );
      expect(measurementService.bulkCreate).toHaveBeenCalledWith({
        documentId: 'doc_1',
        organizationId: 'org_1',
        memberId: 'mem_1',
        dto: {
          measurements: [
            { metricId: 'met_1', periodStart: '2026-07-01', value: '99.9%' },
            {
              metricId: 'met_2',
              periodStart: '2026-04-01',
              value: '0',
              note: 'n',
            },
          ],
        },
      });
    });

    it('rejects an empty measurements array', async () => {
      await expect(
        controller.bulkCreateMeasurements(
          'doc_1',
          reqWith({ measurements: [] }),
          'org_1',
          'mem_1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(measurementService.bulkCreate).not.toHaveBeenCalled();
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
        'bulkCreateMeasurements',
        'saveNarrative',
      ] as const) {
        expect(permissionsFor(method)).toEqual([
          { resource: 'evidence', actions: ['update'] },
        ]);
      }
    });
  });
});

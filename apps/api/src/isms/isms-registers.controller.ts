import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { MemberId, OrganizationId } from '@/auth/auth-context.decorator';
import { HybridAuthGuard } from '@/auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
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
import {
  createRegisterRegistry,
  parseMeasurementBulkBody,
  type IsmsRegisterKey,
  type RegisterHandler,
} from './registers/register-registry';

/**
 * OpenAPI body contracts for the generic register endpoints. They read `req.body`
 * directly (the global ValidationPipe mangles nested JSON), so the request shape
 * is documented explicitly here. Each register accepts its own fields — the union
 * below covers every register's row; per-register validation is enforced at
 * runtime by the registry's zod schemas. Mirrors the inline-schema @ApiBody used
 * by the policies controller for its @Req()-bodied endpoints.
 */
const REGISTER_ROW_BODY = {
  description: 'Register row fields (per-register; validated at runtime by zod)',
  schema: {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['internal', 'external'] },
      category: { type: 'string' },
      description: { type: 'string' },
      effect: { type: 'string' },
      name: { type: 'string' },
      needsExpectations: { type: 'string' },
      interestedPartyId: { type: 'string' },
      partyName: { type: 'string' },
      requirement: { type: 'string' },
      treatment: { type: 'string' },
      objective: { type: 'string' },
      target: { type: 'string' },
      ownerMemberId: { type: 'string' },
      cadence: { type: 'string' },
      plan: { type: 'string' },
      measurementMethod: { type: 'string' },
      status: {
        type: 'string',
        enum: ['not_started', 'on_track', 'at_risk', 'met'],
      },
      // Roles register (5.3) + role assignments (7.2 competence)
      responsibilities: { type: 'string' },
      authorities: { type: 'string' },
      authorityGrantedBy: { type: 'string' },
      requiredCompetence: { type: 'string' },
      auditRoute: {
        type: 'string',
        enum: ['in_house', 'external', 'training_planned'],
        nullable: true,
      },
      auditRouteMemberId: { type: 'string', nullable: true },
      auditFirmName: { type: 'string', nullable: true },
      auditEvidenceRef: { type: 'string', nullable: true },
      auditCourse: { type: 'string', nullable: true },
      auditDueDate: { type: 'string', nullable: true },
      roleId: { type: 'string' },
      memberId: { type: 'string' },
      basisOfCompetence: {
        type: 'string',
        enum: ['education', 'training', 'experience', 'combination'],
        nullable: true,
      },
      evidenceRetained: { type: 'string', nullable: true },
      gap: { type: 'string', nullable: true },
      remediationAction: { type: 'string', nullable: true },
      remediationDueDate: { type: 'string', nullable: true },
      // Monitoring register (9.1) metrics + measurements
      whatIsMeasured: { type: 'string' },
      method: { type: 'string' },
      monitorMemberId: { type: 'string', nullable: true },
      analyzeMemberId: { type: 'string', nullable: true },
      objectiveId: { type: 'string', nullable: true },
      isActive: { type: 'boolean' },
      metricId: { type: 'string' },
      periodStart: {
        type: 'string',
        description:
          'First day of the covered period (YYYY-MM-DD), aligned to the metric cadence',
      },
      value: { type: 'string' },
      note: { type: 'string', nullable: true },
      position: { type: 'integer', minimum: 0 },
    },
  },
} as const;

const MEASUREMENT_BULK_BODY = {
  description:
    'Measurements to record in one save (Metrics due / backfill views)',
  schema: {
    type: 'object',
    properties: {
      measurements: {
        type: 'array',
        minItems: 1,
        maxItems: 200,
        items: {
          type: 'object',
          properties: {
            metricId: { type: 'string' },
            periodStart: { type: 'string' },
            value: { type: 'string' },
            note: { type: 'string', nullable: true },
          },
          required: ['metricId', 'periodStart', 'value'],
        },
      },
    },
    required: ['measurements'],
  },
} as const;

const NARRATIVE_BODY = {
  description: 'Singleton document narrative payload',
  schema: {
    type: 'object',
    properties: {
      narrative: {
        type: 'object',
        description:
          'Per-type narrative object (e.g. ISMS scope or leadership commitment), validated at runtime by zod',
        additionalProperties: true,
      },
    },
    required: ['narrative'],
  },
} as const;

/**
 * Generic CRUD for every ISMS register row (context issues, interested parties,
 * requirements, objectives) via a single create / update / delete trio routed by
 * the `:register` segment, plus the singleton narrative save. Bodies are read
 * from `req.body` and validated by the register registry's zod schemas.
 */
@ApiTags('ISMS')
@Controller({ path: 'isms', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class IsmsRegistersController {
  private readonly registry: Record<IsmsRegisterKey, RegisterHandler>;

  constructor(
    contextIssueService: IsmsContextIssueService,
    interestedPartyService: IsmsInterestedPartyService,
    requirementService: IsmsRequirementService,
    objectiveService: IsmsObjectiveService,
    roleService: IsmsRoleService,
    roleAssignmentService: IsmsRoleAssignmentService,
    metricService: IsmsMetricService,
    auditService: IsmsAuditService,
    auditControlService: IsmsAuditControlService,
    auditFindingService: IsmsAuditFindingService,
    private readonly measurementService: IsmsMeasurementService,
    private readonly narrativeService: IsmsNarrativeService,
  ) {
    this.registry = createRegisterRegistry({
      contextIssues: contextIssueService,
      interestedParties: interestedPartyService,
      requirements: requirementService,
      objectives: objectiveService,
      roles: roleService,
      roleAssignments: roleAssignmentService,
      metrics: metricService,
      measurements: this.measurementService,
      audits: auditService,
      auditControls: auditControlService,
      auditFindings: auditFindingService,
    });
  }

  private resolve(register: string): RegisterHandler {
    const handler = this.registry[register as IsmsRegisterKey];
    if (!handler) {
      throw new BadRequestException(`Unknown ISMS register: ${register}`);
    }
    return handler;
  }

  @Post('documents/:id/registers/:register')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Create a row in an ISMS register' })
  @ApiConsumes('application/json')
  @ApiBody(REGISTER_ROW_BODY)
  @ApiOkResponse({ description: 'Register row created' })
  async createRow(
    @Param('id') id: string,
    @Param('register') register: string,
    // Read req.body directly: the global ValidationPipe mangles nested JSON.
    @Req() req: Request,
    @OrganizationId() organizationId: string,
    // Session-auth member; undefined under API-key auth. Measurements record
    // it as the immutable enteredById.
    @MemberId() memberId: string | undefined,
  ) {
    return this.resolve(register).create({
      documentId: id,
      organizationId,
      data: req.body,
      memberId: memberId ?? null,
    });
  }

  @Patch('registers/:register/:rowId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Update a row in an ISMS register' })
  @ApiConsumes('application/json')
  @ApiBody(REGISTER_ROW_BODY)
  @ApiOkResponse({ description: 'Register row updated' })
  async updateRow(
    @Param('register') register: string,
    @Param('rowId') rowId: string,
    @Req() req: Request,
    @OrganizationId() organizationId: string,
  ) {
    return this.resolve(register).update({
      rowId,
      organizationId,
      data: req.body,
    });
  }

  @Delete('registers/:register/:rowId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Delete a row in an ISMS register' })
  @ApiOkResponse({ description: 'Register row deleted' })
  async deleteRow(
    @Param('register') register: string,
    @Param('rowId') rowId: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.resolve(register).remove({ rowId, organizationId });
  }

  // --- Monitoring (9.1): one-save bulk measurement entry ---

  @Post('documents/:id/measurements/bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('evidence', 'update')
  @ApiOperation({
    summary:
      'Record measurements for several metrics/periods in one save (Metrics due / backfill)',
  })
  @ApiConsumes('application/json')
  @ApiBody(MEASUREMENT_BULK_BODY)
  @ApiOkResponse({ description: 'Measurements recorded' })
  async bulkCreateMeasurements(
    @Param('id') id: string,
    // Read req.body directly: the global ValidationPipe mangles nested JSON.
    @Req() req: Request,
    @OrganizationId() organizationId: string,
    @MemberId() memberId: string | undefined,
  ) {
    return this.measurementService.bulkCreate({
      documentId: id,
      organizationId,
      memberId: memberId ?? null,
      dto: parseMeasurementBulkBody(req.body),
    });
  }

  // --- Singleton narrative (4.3 scope, 5.1 leadership) ---

  @Post('documents/:id/narrative')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Save a singleton document narrative' })
  @ApiConsumes('application/json')
  @ApiBody(NARRATIVE_BODY)
  @ApiOkResponse({ description: 'Narrative saved' })
  async saveNarrative(
    @Param('id') id: string,
    // Read req.body directly: ValidationPipe with transform mangles nested JSON.
    @Req() req: Request,
    @OrganizationId() organizationId: string,
  ) {
    const body = (req.body ?? {}) as { narrative?: unknown };
    return this.narrativeService.save({
      documentId: id,
      organizationId,
      narrative: body.narrative,
    });
  }
}

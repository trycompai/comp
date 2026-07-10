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
import { OrganizationId } from '@/auth/auth-context.decorator';
import { HybridAuthGuard } from '@/auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { IsmsContextIssueService } from './isms-context-issue.service';
import { IsmsInterestedPartyService } from './isms-interested-party.service';
import { IsmsRequirementService } from './isms-requirement.service';
import { IsmsObjectiveService } from './isms-objective.service';
import { IsmsRoleService } from './isms-role.service';
import { IsmsRoleAssignmentService } from './isms-role-assignment.service';
import { IsmsNarrativeService } from './isms-narrative.service';
import {
  createRegisterRegistry,
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
      position: { type: 'integer', minimum: 0 },
    },
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
    private readonly narrativeService: IsmsNarrativeService,
  ) {
    this.registry = createRegisterRegistry({
      contextIssues: contextIssueService,
      interestedParties: interestedPartyService,
      requirements: requirementService,
      objectives: objectiveService,
      roles: roleService,
      roleAssignments: roleAssignmentService,
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
  ) {
    return this.resolve(register).create({
      documentId: id,
      organizationId,
      data: req.body,
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

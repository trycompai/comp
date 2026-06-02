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
import { IsmsNarrativeService } from './isms-narrative.service';
import {
  createRegisterRegistry,
  type IsmsRegisterKey,
  type RegisterHandler,
} from './registers/register-registry';

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
    private readonly narrativeService: IsmsNarrativeService,
  ) {
    this.registry = createRegisterRegistry({
      contextIssues: contextIssueService,
      interestedParties: interestedPartyService,
      requirements: requirementService,
      objectives: objectiveService,
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

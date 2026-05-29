import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
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
import { IsmsInterestedPartyService } from './isms-interested-party.service';
import { IsmsRequirementService } from './isms-requirement.service';
import { IsmsObjectiveService } from './isms-objective.service';
import { IsmsNarrativeService } from './isms-narrative.service';
import { CreateInterestedPartyDto } from './dto/create-interested-party.dto';
import { UpdateInterestedPartyDto } from './dto/update-interested-party.dto';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { CreateObjectiveDto } from './dto/create-objective.dto';
import { UpdateObjectiveDto } from './dto/update-objective.dto';

/**
 * Register CRUD (interested parties, requirements, objectives) and the singleton
 * narrative save. Split from IsmsController to keep each controller under the
 * 300-line limit; both live in IsmsModule under the same `isms` path.
 */
@ApiTags('ISMS')
@Controller({ path: 'isms', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class IsmsRegistersController {
  constructor(
    private readonly interestedPartyService: IsmsInterestedPartyService,
    private readonly requirementService: IsmsRequirementService,
    private readonly objectiveService: IsmsObjectiveService,
    private readonly narrativeService: IsmsNarrativeService,
  ) {}

  // --- Interested Parties (4.2a) ---

  @Post('documents/:id/interested-parties')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Create a manual interested party' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Interested party created' })
  async createInterestedParty(
    @Param('id') id: string,
    @Body() dto: CreateInterestedPartyDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.interestedPartyService.create({
      documentId: id,
      organizationId,
      dto,
    });
  }

  @Post('interested-parties/:partyId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Update an interested party' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Interested party updated' })
  async updateInterestedParty(
    @Param('partyId') partyId: string,
    @Body() dto: UpdateInterestedPartyDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.interestedPartyService.update({ partyId, organizationId, dto });
  }

  @Delete('interested-parties/:partyId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Delete an interested party' })
  @ApiOkResponse({ description: 'Interested party deleted' })
  async deleteInterestedParty(
    @Param('partyId') partyId: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.interestedPartyService.remove({ partyId, organizationId });
  }

  // --- Requirements & Treatment (4.2b/c) ---

  @Post('documents/:id/requirements')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Create a manual requirement' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Requirement created' })
  async createRequirement(
    @Param('id') id: string,
    @Body() dto: CreateRequirementDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.requirementService.create({
      documentId: id,
      organizationId,
      dto,
    });
  }

  @Post('requirements/:requirementId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Update a requirement' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Requirement updated' })
  async updateRequirement(
    @Param('requirementId') requirementId: string,
    @Body() dto: UpdateRequirementDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.requirementService.update({
      requirementId,
      organizationId,
      dto,
    });
  }

  @Delete('requirements/:requirementId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Delete a requirement' })
  @ApiOkResponse({ description: 'Requirement deleted' })
  async deleteRequirement(
    @Param('requirementId') requirementId: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.requirementService.remove({ requirementId, organizationId });
  }

  // --- Objectives (6.2) ---

  @Post('documents/:id/objectives')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Create a manual objective' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Objective created' })
  async createObjective(
    @Param('id') id: string,
    @Body() dto: CreateObjectiveDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.objectiveService.create({
      documentId: id,
      organizationId,
      dto,
    });
  }

  @Post('objectives/:objectiveId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Update an objective' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Objective updated' })
  async updateObjective(
    @Param('objectiveId') objectiveId: string,
    @Body() dto: UpdateObjectiveDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.objectiveService.update({ objectiveId, organizationId, dto });
  }

  @Delete('objectives/:objectiveId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Delete an objective' })
  @ApiOkResponse({ description: 'Objective deleted' })
  async deleteObjective(
    @Param('objectiveId') objectiveId: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.objectiveService.remove({ objectiveId, organizationId });
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

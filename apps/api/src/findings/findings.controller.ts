import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiSecurity,
} from '@nestjs/swagger';
import {
  db,
  EvidenceFormType as DbEvidenceFormType,
  FindingArea,
  FindingSeverity,
  FindingStatus,
} from '@db';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { AuthContext } from '../auth/auth-context.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { FindingsService } from './findings.service';
import { CreateFindingDto } from './dto/create-finding.dto';
import { UpdateFindingDto } from './dto/update-finding.dto';
import { ValidateFindingIdPipe } from './pipes/validate-finding-id.pipe';
import { toDbEvidenceFormType } from '@trycompai/company';
import { evidenceFormTypeSchema } from '@/evidence-forms/evidence-forms.definitions';

@ApiTags('Findings')
@Controller({ path: 'findings', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  /**
   * List findings for the organization. Supports optional target/status filters.
   * Replaces the previous per-target and per-form-type GET endpoints.
   */
  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission('finding', 'read')
  @ApiOperation({ summary: 'List findings for organization (optionally filtered)' })
  @ApiQuery({ name: 'status', required: false, enum: FindingStatus })
  @ApiQuery({ name: 'severity', required: false, enum: FindingSeverity })
  @ApiQuery({ name: 'area', required: false, enum: FindingArea })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'evidenceSubmissionId', required: false })
  @ApiQuery({
    name: 'evidenceFormType',
    required: false,
    enum: evidenceFormTypeSchema.options,
  })
  @ApiQuery({ name: 'policyId', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'riskId', required: false })
  @ApiQuery({ name: 'memberId', required: false })
  @ApiQuery({ name: 'deviceId', required: false })
  async listFindings(
    @AuthContext() authContext: AuthContextType,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('area') area?: string,
    @Query('taskId') taskId?: string,
    @Query('evidenceSubmissionId') evidenceSubmissionId?: string,
    @Query('evidenceFormType') evidenceFormType?: string,
    @Query('policyId') policyId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('riskId') riskId?: string,
    @Query('memberId') memberId?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    let validatedStatus: FindingStatus | undefined;
    if (status) {
      if (!Object.values(FindingStatus).includes(status as FindingStatus)) {
        throw new BadRequestException(
          `Invalid status. Must be one of: ${Object.values(FindingStatus).join(', ')}`,
        );
      }
      validatedStatus = status as FindingStatus;
    }

    let validatedSeverity: FindingSeverity | undefined;
    if (severity) {
      if (
        !Object.values(FindingSeverity).includes(severity as FindingSeverity)
      ) {
        throw new BadRequestException(
          `Invalid severity. Must be one of: ${Object.values(FindingSeverity).join(', ')}`,
        );
      }
      validatedSeverity = severity as FindingSeverity;
    }

    let validatedArea: FindingArea | undefined;
    if (area) {
      if (!Object.values(FindingArea).includes(area as FindingArea)) {
        throw new BadRequestException(
          `Invalid area. Must be one of: ${Object.values(FindingArea).join(', ')}`,
        );
      }
      validatedArea = area as FindingArea;
    }

    let dbFormType: DbEvidenceFormType | undefined = undefined;
    if (evidenceFormType) {
      const parsed = evidenceFormTypeSchema.safeParse(evidenceFormType);
      if (!parsed.success) {
        throw new BadRequestException(
          `Invalid evidenceFormType. Must be one of: ${evidenceFormTypeSchema.options.join(', ')}`,
        );
      }
      dbFormType = toDbEvidenceFormType(parsed.data);
    }

    return await this.findingsService.listForOrganization(
      authContext.organizationId,
      {
        status: validatedStatus,
        severity: validatedSeverity,
        area: validatedArea,
        taskId,
        evidenceSubmissionId,
        evidenceFormType: dbFormType,
        policyId,
        vendorId,
        riskId,
        memberId,
        deviceId,
      },
    );
  }

  /** Kept for backwards compatibility — same behavior as GET /findings. */
  @Get('organization')
  @UseGuards(PermissionGuard)
  @RequirePermission('finding', 'read')
  @ApiOperation({ summary: 'List all findings for the organization' })
  @ApiQuery({ name: 'status', required: false, enum: FindingStatus })
  async getOrganizationFindings(
    @Query('status') status: string | undefined,
    @AuthContext() authContext: AuthContextType,
  ) {
    let validatedStatus: FindingStatus | undefined;
    if (status) {
      if (!Object.values(FindingStatus).includes(status as FindingStatus)) {
        throw new BadRequestException(
          `Invalid status. Must be one of: ${Object.values(FindingStatus).join(', ')}`,
        );
      }
      validatedStatus = status as FindingStatus;
    }
    return await this.findingsService.listForOrganization(
      authContext.organizationId,
      { status: validatedStatus },
    );
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('finding', 'read')
  @ApiOperation({ summary: 'Get finding by ID' })
  @ApiParam({ name: 'id', description: 'Finding ID' })
  async getFindingById(
    @Param('id', ValidateFindingIdPipe) id: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    return await this.findingsService.findById(authContext.organizationId, id);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission('finding', 'create')
  @ApiOperation({ summary: 'Create a finding (auditor or platform admin only)' })
  @ApiBody({ type: CreateFindingDto })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createFinding(
    @Body() createDto: CreateFindingDto,
    @AuthContext() authContext: AuthContextType,
  ) {
    if (!authContext.userId) {
      throw new BadRequestException('User ID is required');
    }

    const isAuditor = authContext.userRoles?.includes('auditor');
    const isPlatformAdmin = await this.checkPlatformAdmin(authContext.userId);

    if (!isAuditor && !isPlatformAdmin) {
      throw new ForbiddenException(
        'Only auditors or platform admins can create findings',
      );
    }

    const member = await db.member.findFirst({
      where: {
        userId: authContext.userId,
        organizationId: authContext.organizationId,
        deactivated: false,
      },
    });

    if (!member) {
      throw new BadRequestException(
        'User is not a member of this organization',
      );
    }

    return await this.findingsService.create(
      authContext.organizationId,
      member.id,
      authContext.userId,
      createDto,
    );
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('finding', 'update')
  @ApiOperation({
    summary: 'Update a finding (status transition rules apply)',
  })
  @ApiParam({ name: 'id', description: 'Finding ID' })
  @ApiBody({ type: UpdateFindingDto })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async updateFinding(
    @Param('id', ValidateFindingIdPipe) id: string,
    @Body() updateDto: UpdateFindingDto,
    @AuthContext() authContext: AuthContextType,
  ) {
    if (!authContext.userId) {
      throw new BadRequestException('User ID is required');
    }

    const isPlatformAdmin = await this.checkPlatformAdmin(authContext.userId);

    const member = await db.member.findFirst({
      where: {
        userId: authContext.userId,
        organizationId: authContext.organizationId,
        deactivated: false,
      },
    });

    if (!member) {
      throw new BadRequestException(
        'User is not a member of this organization',
      );
    }

    return await this.findingsService.update(
      authContext.organizationId,
      id,
      updateDto,
      authContext.userRoles || [],
      isPlatformAdmin,
      authContext.userId,
      member.id,
    );
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('finding', 'delete')
  @ApiOperation({ summary: 'Delete a finding (auditor or platform admin only)' })
  @ApiParam({ name: 'id', description: 'Finding ID' })
  async deleteFinding(
    @Param('id', ValidateFindingIdPipe) id: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    if (!authContext.userId) {
      throw new BadRequestException('User ID is required');
    }

    const isAuditor = authContext.userRoles?.includes('auditor');
    const isPlatformAdmin = await this.checkPlatformAdmin(authContext.userId);

    if (!isAuditor && !isPlatformAdmin) {
      throw new ForbiddenException(
        'Only auditors or platform admins can delete findings',
      );
    }

    const member = await db.member.findFirst({
      where: {
        userId: authContext.userId,
        organizationId: authContext.organizationId,
        deactivated: false,
      },
    });

    if (!member) {
      throw new BadRequestException(
        'User is not a member of this organization',
      );
    }

    return await this.findingsService.delete(
      authContext.organizationId,
      id,
      authContext.userId,
      member.id,
    );
  }

  @Get(':id/history')
  @UseGuards(PermissionGuard)
  @RequirePermission('finding', 'read')
  @ApiOperation({ summary: 'Get activity history for a finding' })
  @ApiParam({ name: 'id', description: 'Finding ID' })
  async getFindingHistory(
    @Param('id', ValidateFindingIdPipe) id: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    return await this.findingsService.getActivity(
      authContext.organizationId,
      id,
    );
  }

  private async checkPlatformAdmin(userId?: string): Promise<boolean> {
    if (!userId) return false;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === 'admin';
  }
}

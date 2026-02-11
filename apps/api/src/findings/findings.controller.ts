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
  ApiHeader,
  ApiSecurity,
} from '@nestjs/swagger';
import { FindingStatus } from '@trycompai/db/server';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { RequireRoles } from '../auth/role-validator.guard';
import { AuthContext } from '../auth/auth-context.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { FindingsService } from './findings.service';
import { CreateFindingDto } from './dto/create-finding.dto';
import { UpdateFindingDto } from './dto/update-finding.dto';
import { ValidateFindingIdPipe } from './pipes/validate-finding-id.pipe';
import { db } from '@trycompai/db/server';

@ApiTags('Findings')
@Controller({ path: 'findings', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get findings for a task',
    description: 'Retrieve all findings for a specific task',
  })
  @ApiQuery({
    name: 'taskId',
    required: true,
    description: 'Task ID to get findings for',
    example: 'tsk_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'List of findings for the task',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async getFindingsByTask(
    @Query('taskId') taskId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    if (!taskId) {
      throw new BadRequestException('taskId query parameter is required');
    }
    return await this.findingsService.findByTaskId(
      authContext.organizationId,
      taskId,
    );
  }

  @Get('organization')
  @ApiOperation({
    summary: 'Get all findings for organization',
    description: 'Retrieve all findings for the organization',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: FindingStatus,
    description: 'Filter by status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all findings for the organization',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status value',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getOrganizationFindings(
    @Query('status') status: string | undefined,
    @AuthContext() authContext: AuthContextType,
  ) {
    // Validate status enum if provided
    let validatedStatus: FindingStatus | undefined;
    if (status) {
      if (!Object.values(FindingStatus).includes(status as FindingStatus)) {
        throw new BadRequestException(
          `Invalid status value. Must be one of: ${Object.values(FindingStatus).join(', ')}`,
        );
      }
      validatedStatus = status as FindingStatus;
    }

    return await this.findingsService.findByOrganizationId(
      authContext.organizationId,
      validatedStatus,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get finding by ID',
    description: 'Retrieve a specific finding by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Finding ID',
    example: 'fnd_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'The finding',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Finding not found',
  })
  async getFindingById(
    @Param('id', ValidateFindingIdPipe) id: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    return await this.findingsService.findById(authContext.organizationId, id);
  }

  @Post()
  @UseGuards(RequireRoles('auditor', 'admin', 'owner'))
  @ApiOperation({
    summary: 'Create a finding',
    description:
      'Create a new finding for a task (Auditor or Platform Admin only)',
  })
  @ApiBody({
    type: CreateFindingDto,
    description: 'Finding data',
  })
  @ApiResponse({
    status: 201,
    description: 'The created finding',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Auditor or Platform Admin required',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
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
    // Validate userId first (required for session auth)
    if (!authContext.userId) {
      throw new BadRequestException('User ID is required');
    }

    // Verify user has auditor role or is platform admin
    const isAuditor = authContext.userRoles?.includes('auditor');
    const isPlatformAdmin = await this.checkPlatformAdmin(authContext.userId);

    if (!isAuditor && !isPlatformAdmin) {
      throw new ForbiddenException(
        'Only auditors or platform admins can create findings',
      );
    }

    // Get member ID for the user
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
  @UseGuards(RequireRoles('auditor', 'admin', 'owner'))
  @ApiOperation({
    summary: 'Update a finding',
    description:
      'Update a finding. Status transition rules apply based on user role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Finding ID',
    example: 'fnd_abc123',
  })
  @ApiBody({
    type: UpdateFindingDto,
    description: 'Finding update data',
  })
  @ApiResponse({
    status: 200,
    description: 'The updated finding',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions for status transition',
  })
  @ApiResponse({
    status: 404,
    description: 'Finding not found',
  })
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
    // Validate userId first (required for session auth)
    if (!authContext.userId) {
      throw new BadRequestException('User ID is required');
    }

    const isPlatformAdmin = await this.checkPlatformAdmin(authContext.userId);

    // Get member ID for audit logging
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
  @UseGuards(RequireRoles('auditor', 'admin', 'owner'))
  @ApiOperation({
    summary: 'Delete a finding',
    description: 'Delete a finding (Auditor or Platform Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Finding ID',
    example: 'fnd_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Finding deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Auditor or Platform Admin required',
  })
  @ApiResponse({
    status: 404,
    description: 'Finding not found',
  })
  async deleteFinding(
    @Param('id', ValidateFindingIdPipe) id: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    // Validate userId first (required for session auth)
    if (!authContext.userId) {
      throw new BadRequestException('User ID is required');
    }

    // Verify user has auditor role or is platform admin
    const isAuditor = authContext.userRoles?.includes('auditor');
    const isPlatformAdmin = await this.checkPlatformAdmin(authContext.userId);

    if (!isAuditor && !isPlatformAdmin) {
      throw new ForbiddenException(
        'Only auditors or platform admins can delete findings',
      );
    }

    // Get member ID for audit logging
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
  @ApiOperation({
    summary: 'Get finding history',
    description: 'Retrieve the activity history for a specific finding',
  })
  @ApiParam({
    name: 'id',
    description: 'Finding ID',
    example: 'fnd_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'List of audit log entries for the finding',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Finding not found',
  })
  async getFindingHistory(
    @Param('id', ValidateFindingIdPipe) id: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    return await this.findingsService.getActivity(
      authContext.organizationId,
      id,
    );
  }

  /**
   * Check if the user is a platform admin
   */
  private async checkPlatformAdmin(userId?: string): Promise<boolean> {
    if (!userId) return false;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true },
    });

    return user?.isPlatformAdmin ?? false;
  }
}

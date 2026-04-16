import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FindingStatus } from '@db';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { FindingsService } from '../findings/findings.service';
import { CreateFindingDto } from '../findings/dto/create-finding.dto';
import { UpdateFindingDto } from '../findings/dto/update-finding.dto';
import { AdminAuditLogInterceptor } from './admin-audit-log.interceptor';
import type { AdminRequest } from './platform-admin-auth-context';

@ApiExcludeController()
@ApiTags('Admin - Findings')
@Controller({ path: 'admin/organizations', version: '1' })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(AdminAuditLogInterceptor)
@Throttle({ default: { ttl: 60000, limit: 30 } })
export class AdminFindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Get(':orgId/findings')
  @ApiOperation({ summary: 'List all findings for an organization (admin)' })
  async list(@Param('orgId') orgId: string, @Query('status') status?: string) {
    let validatedStatus: FindingStatus | undefined;
    if (status) {
      if (!Object.values(FindingStatus).includes(status as FindingStatus)) {
        throw new BadRequestException(
          `Invalid status. Must be one of: ${Object.values(FindingStatus).join(', ')}`,
        );
      }
      validatedStatus = status as FindingStatus;
    }

    return this.findingsService.findByOrganizationId(orgId, validatedStatus);
  }

  @Post(':orgId/findings')
  @ApiOperation({ summary: 'Create a finding for an organization (admin)' })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async create(
    @Param('orgId') orgId: string,
    @Body() createDto: CreateFindingDto,
    @Req() req: AdminRequest,
  ) {
    return this.findingsService.create(orgId, null, req.userId, createDto);
  }

  @Patch(':orgId/findings/:findingId')
  @ApiOperation({ summary: 'Update a finding for an organization (admin)' })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async update(
    @Param('orgId') orgId: string,
    @Param('findingId') findingId: string,
    @Body() updateDto: UpdateFindingDto,
    @Req() req: AdminRequest,
  ) {
    return this.findingsService.update(
      orgId,
      findingId,
      updateDto,
      [],
      true,
      req.userId,
      null,
    );
  }
}

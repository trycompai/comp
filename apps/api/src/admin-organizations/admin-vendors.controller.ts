import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { VendorCategory, VendorStatus } from '@trycompai/db';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { VendorsService } from '../vendors/vendors.service';
import { AdminAuditLogInterceptor } from './admin-audit-log.interceptor';
import { CreateAdminVendorDto } from './dto/create-admin-vendor.dto';
import type { AdminRequest } from './platform-admin-auth-context';

interface UpdateVendorBody {
  status?: string;
  category?: string;
}

@ApiTags('Admin - Vendors')
@Controller({ path: 'admin/organizations', version: '1' })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(AdminAuditLogInterceptor)
@Throttle({ default: { ttl: 60000, limit: 30 } })
export class AdminVendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get(':orgId/vendors')
  @ApiOperation({ summary: 'List all vendors for an organization (admin)' })
  async list(@Param('orgId') orgId: string) {
    return this.vendorsService.findAllByOrganization(orgId);
  }

  @Post(':orgId/vendors')
  @ApiOperation({ summary: 'Create a vendor for an organization (admin)' })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async create(
    @Param('orgId') orgId: string,
    @Body() createDto: CreateAdminVendorDto,
    @Req() req: AdminRequest,
  ) {
    return this.vendorsService.create(orgId, createDto, req.userId);
  }

  @Patch(':orgId/vendors/:vendorId')
  @ApiOperation({ summary: 'Update a vendor for an organization (admin)' })
  async update(
    @Param('orgId') orgId: string,
    @Param('vendorId') vendorId: string,
    @Body() body: UpdateVendorBody,
  ) {
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (
        !Object.values(VendorStatus).includes(body.status as VendorStatus)
      ) {
        throw new BadRequestException(
          `Invalid status. Must be one of: ${Object.values(VendorStatus).join(', ')}`,
        );
      }
      updateData.status = body.status as VendorStatus;
    }

    if (body.category !== undefined) {
      if (
        !Object.values(VendorCategory).includes(
          body.category as VendorCategory,
        )
      ) {
        throw new BadRequestException(
          `Invalid category. Must be one of: ${Object.values(VendorCategory).join(', ')}`,
        );
      }
      updateData.category = body.category as VendorCategory;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException(
        'At least one field (status, category) is required',
      );
    }

    return this.vendorsService.updateById(vendorId, orgId, updateData);
  }

  @Post(':orgId/vendors/:vendorId/trigger-assessment')
  @ApiOperation({ summary: 'Trigger vendor risk assessment (admin)' })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async triggerAssessment(
    @Param('orgId') orgId: string,
    @Param('vendorId') vendorId: string,
    @Req() req: AdminRequest,
  ) {
    return this.vendorsService.triggerAssessment(vendorId, orgId, req.userId);
  }
}

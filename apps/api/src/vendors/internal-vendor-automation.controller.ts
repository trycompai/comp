import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId } from '../auth/auth-context.decorator';
import { VendorsService } from './vendors.service';
import {
  TriggerVendorRiskAssessmentBatchDto,
  TriggerSingleVendorRiskAssessmentDto,
} from './dto/trigger-vendor-risk-assessment.dto';

@ApiTags('Internal - Vendors')
@Controller({ path: 'internal/vendors', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class InternalVendorAutomationController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post('risk-assessment/trigger-batch')
  @HttpCode(200)
  @RequirePermission('vendor', 'update')
  @ApiOperation({
    summary:
      'Trigger vendor risk assessment tasks for a batch of vendors (internal)',
  })
  @ApiResponse({ status: 200, description: 'Tasks triggered' })
  async triggerVendorRiskAssessmentBatch(
    @OrganizationId() organizationId: string,
    @Body() body: TriggerVendorRiskAssessmentBatchDto,
  ) {
    const result = await this.vendorsService.triggerVendorRiskAssessments({
      organizationId,
      withResearch: body.withResearch ?? false,
      vendors: body.vendors,
    });

    return {
      success: true,
      ...result,
    };
  }

  @Post('risk-assessment/trigger-single')
  @HttpCode(200)
  @RequirePermission('vendor', 'update')
  @ApiOperation({
    summary:
      'Trigger vendor risk assessment for a single vendor and return run info (internal)',
  })
  @ApiResponse({
    status: 200,
    description: 'Task triggered with run info for real-time tracking',
  })
  async triggerSingleVendorRiskAssessment(
    @OrganizationId() organizationId: string,
    @Body() body: TriggerSingleVendorRiskAssessmentDto,
  ) {
    const result = await this.vendorsService.triggerSingleVendorRiskAssessment({
      organizationId,
      vendorId: body.vendorId,
      vendorName: body.vendorName,
      vendorWebsite: body.vendorWebsite,
      createdByUserId: body.createdByUserId,
    });

    return {
      success: true,
      runId: result.runId,
      publicAccessToken: result.publicAccessToken,
    };
  }
}

import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InternalTokenGuard } from '../auth/internal-token.guard';
import { VendorsService } from './vendors.service';
import { TriggerVendorRiskAssessmentBatchDto } from './dto/trigger-vendor-risk-assessment.dto';

@ApiTags('Internal - Vendors')
@Controller({ path: 'internal/vendors', version: '1' })
@UseGuards(InternalTokenGuard)
@ApiHeader({
  name: 'X-Internal-Token',
  description: 'Internal service token (required in production)',
  required: false,
})
export class InternalVendorAutomationController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post('risk-assessment/trigger-batch')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Trigger vendor risk assessment tasks for a batch of vendors (internal)',
  })
  @ApiResponse({ status: 200, description: 'Tasks triggered' })
  async triggerVendorRiskAssessmentBatch(
    @Body() body: TriggerVendorRiskAssessmentBatchDto,
  ) {
    // Log incoming request for debugging
    console.log('[InternalVendorAutomationController] Received batch trigger request', {
      organizationId: body.organizationId,
      vendorCount: body.vendors.length,
      withResearch: body.withResearch,
    });

    const result = await this.vendorsService.triggerVendorRiskAssessments({
      organizationId: body.organizationId,
      // Default to "ensure" mode (cheap). Only scheduled refreshes should force research.
      withResearch: body.withResearch ?? false,
      vendors: body.vendors,
    });

    console.log('[InternalVendorAutomationController] Batch trigger completed', result);

    return {
      success: true,
      ...result,
    };
  }
}



import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { OrganizationId, UserId } from '../auth/auth-context.decorator';
import { PolicyAcknowledgementsService } from './policy-acknowledgements.service';
import { AcknowledgePoliciesDto } from './schemas/acknowledge-policies.dto';

@ApiTags('Policies')
@Controller({ path: 'policies', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for JWT auth, optional for API key auth)',
  required: false,
})
export class PolicyAcknowledgementsController {
  constructor(
    private readonly policyAcknowledgementsService: PolicyAcknowledgementsService,
  ) {}

  @Post(':id/acknowledge')
  @ApiOperation({
    summary: 'Acknowledge (sign) a policy for the current user',
  })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({ status: 200, description: 'Acknowledgement recorded' })
  async acknowledgePolicy(
    @Param('id') policyId: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    return this.policyAcknowledgementsService.acknowledgePolicy({
      organizationId,
      userId,
      policyId,
    });
  }

  @Post('acknowledge-bulk')
  @ApiOperation({
    summary: 'Acknowledge (sign) multiple policies for the current user',
  })
  @ApiBody({ type: AcknowledgePoliciesDto })
  @ApiResponse({ status: 200, description: 'Acknowledgements recorded' })
  async acknowledgePolicies(
    @Body() body: AcknowledgePoliciesDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    return this.policyAcknowledgementsService.acknowledgePolicies({
      organizationId,
      userId,
      policyIds: body.policyIds,
    });
  }

  @Get(':id/pdf-url')
  @ApiOperation({
    summary: 'Get a signed URL for a policy PDF (if available)',
  })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({ status: 200, description: 'Signed URL payload' })
  async getPolicyPdfUrl(
    @Param('id') policyId: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    return this.policyAcknowledgementsService.getPolicyPdfUrl({
      organizationId,
      userId,
      policyId,
    });
  }
}

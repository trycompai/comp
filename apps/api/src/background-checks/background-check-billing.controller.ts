import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { BackgroundCheckBillingService } from './background-check-billing.service';
import {
  BackgroundCheckBillingPortalDto,
  BackgroundCheckSetupSessionDto,
  BackgroundCheckSetupSuccessDto,
} from './dto/background-check-billing.dto';

@ApiTags('Background Check Billing')
@Controller({ path: 'background-check-billing', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class BackgroundCheckBillingController {
  constructor(private readonly billingService: BackgroundCheckBillingService) {}

  @Get('status')
  @RequirePermission('organization', 'read')
  @ApiOperation({ summary: 'Get background check billing status' })
  async getStatus(@OrganizationId() organizationId: string) {
    return this.billingService.getStatus(organizationId);
  }

  @Post('setup-session')
  @RequirePermission('organization', 'update')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Create a Stripe setup session for background checks',
  })
  async setupSession(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() body: BackgroundCheckSetupSessionDto,
  ) {
    return this.billingService.createSetupSession({
      organizationId,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      customerEmail: authContext.userEmail,
    });
  }

  @Post('setup-success')
  @RequirePermission('organization', 'update')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle successful background check billing setup' })
  async setupSuccess(
    @OrganizationId() organizationId: string,
    @Body() body: BackgroundCheckSetupSuccessDto,
  ) {
    return this.billingService.handleSetupSuccess({
      organizationId,
      sessionId: body.sessionId,
    });
  }

  @Post('portal')
  @RequirePermission('organization', 'update')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a Stripe billing portal session' })
  async portal(
    @OrganizationId() organizationId: string,
    @Body() body: BackgroundCheckBillingPortalDto,
  ) {
    return this.billingService.createBillingPortalSession({
      organizationId,
      returnUrl: body.returnUrl,
    });
  }
}

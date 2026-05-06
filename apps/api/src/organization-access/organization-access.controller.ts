import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import {
  AutoApproveResult,
  OrganizationAccessService,
} from './organization-access.service';

@ApiTags('Organization')
@Controller({ path: 'organization-access', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
export class OrganizationAccessController {
  constructor(
    private readonly organizationAccessService: OrganizationAccessService,
  ) {}

  @Post('auto-approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('organization', 'update')
  @ApiOperation({
    summary: 'Auto-approve organization access via domain or self-hosted check',
    description:
      'Grants hasAccess on the active organization if the requesting user is an internal trycomp.ai user, the deployment is self-hosted, or the user email domain matches the organization website domain and is an active Stripe customer.',
  })
  async autoApprove(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ): Promise<AutoApproveResult> {
    return this.organizationAccessService.autoApproveAccess({
      organizationId,
      userEmail: authContext.userEmail,
    });
  }
}

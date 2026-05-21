import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { Public } from '../auth/public.decorator';
import {
  RequirePermission,
  RequirePermissions,
} from '../auth/require-permission.decorator';
import { ReadinessService } from './readiness.service';

@ApiTags('Readiness')
@Controller({ path: 'readiness', version: '1' })
export class ReadinessController {
  constructor(private readonly readinessService: ReadinessService) {}

  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Register or reuse an organization for agent-led readiness',
  })
  async register(
    @Headers('x-compctl-token') bootstrapToken: string | undefined,
    @Body() body: unknown,
  ) {
    return this.readinessService.register(bootstrapToken, body);
  }

  @Get('status')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('organization', 'read')
  @ApiSecurity('apikey')
  @ApiOperation({ summary: 'Get SOC 2 readiness status for the organization' })
  async status(@OrganizationId() organizationId: string) {
    return this.readinessService.getStatus(organizationId);
  }

  @Post('apply')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermissions([
    { resource: 'organization', actions: ['update'] },
    { resource: 'policy', actions: ['create', 'update'] },
    { resource: 'task', actions: ['create', 'update'] },
    { resource: 'evidence', actions: ['create'] },
    { resource: 'vendor', actions: ['create', 'update'] },
    { resource: 'risk', actions: ['create', 'update'] },
  ])
  @ApiSecurity('apikey')
  @ApiOperation({
    summary: 'Apply agent-produced readiness context and progress updates',
  })
  async apply(@OrganizationId() organizationId: string, @Body() body: unknown) {
    return this.readinessService.applyReadiness(organizationId, body);
  }
}

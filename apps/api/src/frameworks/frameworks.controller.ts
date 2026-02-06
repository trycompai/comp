import {
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId } from '../auth/auth-context.decorator';
import { FrameworksService } from './frameworks.service';

@ApiTags('Frameworks')
@ApiBearerAuth()
@UseGuards(HybridAuthGuard, PermissionGuard)
@Controller({ path: 'frameworks', version: '1' })
export class FrameworksController {
  constructor(private readonly frameworksService: FrameworksService) {}

  @Get()
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'List framework instances for the organization' })
  async findAll(@OrganizationId() organizationId: string) {
    const data = await this.frameworksService.findAll(organizationId);
    return { data, count: data.length };
  }

  @Delete(':id')
  @RequirePermission('framework', 'delete')
  @ApiOperation({ summary: 'Delete a framework instance' })
  async delete(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.frameworksService.delete(id, organizationId);
  }
}

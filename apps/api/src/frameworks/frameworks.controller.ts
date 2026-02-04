import {
  Controller,
  Delete,
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
@Controller('v1/frameworks')
export class FrameworksController {
  constructor(private readonly frameworksService: FrameworksService) {}

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

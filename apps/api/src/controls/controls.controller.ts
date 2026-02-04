import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId } from '../auth/auth-context.decorator';
import { ControlsService } from './controls.service';
import { CreateControlDto } from './dto/create-control.dto';

@ApiTags('Controls')
@ApiBearerAuth()
@UseGuards(HybridAuthGuard, PermissionGuard)
@Controller('v1/controls')
export class ControlsController {
  constructor(private readonly controlsService: ControlsService) {}

  @Post()
  @RequirePermission('control', 'create')
  @ApiOperation({ summary: 'Create a new control' })
  async create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateControlDto,
  ) {
    return this.controlsService.create(organizationId, dto);
  }

  @Delete(':id')
  @RequirePermission('control', 'delete')
  @ApiOperation({ summary: 'Delete a control' })
  async delete(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.controlsService.delete(id, organizationId);
  }
}

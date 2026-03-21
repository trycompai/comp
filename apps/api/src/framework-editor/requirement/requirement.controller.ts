import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementService } from './requirement.service';

@ApiTags('Framework Editor Requirements')
@Controller({ path: 'framework-editor/requirement', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class RequirementController {
  constructor(private readonly service: RequirementService) {}

  @Get()
  @RequirePermission('framework', 'read')
  async findAll(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const limit = Math.min(Number(take) || 500, 500);
    const offset = Number(skip) || 0;
    return this.service.findAll(limit, offset);
  }

  @Post()
  @RequirePermission('framework', 'create')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() dto: CreateRequirementDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission('framework', 'update')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRequirementDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('framework', 'delete')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}

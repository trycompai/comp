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
import { ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementService } from './requirement.service';

@ApiTags('Framework Editor Requirements')
@Controller({ path: 'framework-editor/requirement', version: '1' })
@UseGuards(PlatformAdminGuard)
export class RequirementController {
  constructor(private readonly service: RequirementService) {}

  @Get()
  async findAll(@Query('take') take?: string, @Query('skip') skip?: string) {
    const limit = Math.min(Number(take) || 500, 500);
    const offset = Number(skip) || 0;
    return this.service.findAll(limit, offset);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() dto: CreateRequirementDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateRequirementDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}

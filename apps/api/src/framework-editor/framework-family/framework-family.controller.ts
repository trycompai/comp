import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { CreateFrameworkFamilyDto } from './dto/create-framework-family.dto';
import { MoveFrameworksDto } from './dto/move-frameworks.dto';
import { UpdateFrameworkFamilyDto } from './dto/update-framework-family.dto';
import { FrameworkFamilyService } from './framework-family.service';

@ApiTags('Framework Editor Framework Families')
@Controller({ path: 'framework-editor/framework-family', version: '1' })
@UseGuards(PlatformAdminGuard)
export class FrameworkFamilyController {
  constructor(private readonly service: FrameworkFamilyService) {}

  @Get()
  @ApiOperation({ summary: 'List framework families with framework counts' })
  async findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a framework family' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() dto: CreateFrameworkFamilyDto) {
    return this.service.create(dto);
  }

  @Post('move')
  @ApiOperation({ summary: 'Move frameworks into a family (or to the root)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async move(@Body() dto: MoveFrameworksDto) {
    return this.service.moveFrameworks(dto.frameworkIds, dto.familyId ?? null);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a framework family' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateFrameworkFamilyDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a framework family (must be empty)' })
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}

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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { CreateFrameworkDto } from './dto/create-framework.dto';
import { ImportFrameworkDto } from './dto/import-framework.dto';
import { UpdateFrameworkDto } from './dto/update-framework.dto';
import { FrameworkExportService } from './framework-export.service';
import { FrameworkEditorFrameworkService } from './framework.service';

@ApiTags('Framework Editor Frameworks')
@Controller({ path: 'framework-editor/framework', version: '1' })
@UseGuards(PlatformAdminGuard)
export class FrameworkEditorFrameworkController {
  constructor(
    private readonly frameworkService: FrameworkEditorFrameworkService,
    private readonly exportService: FrameworkExportService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List frameworks' })
  async findAll(@Query('take') take?: string, @Query('skip') skip?: string) {
    const limit = Math.min(Number(take) || 500, 500);
    const offset = Number(skip) || 0;
    return this.frameworkService.findAll(limit, offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a framework by ID' })
  async findById(@Param('id') id: string) {
    return this.frameworkService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a framework' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() dto: CreateFrameworkDto) {
    return this.frameworkService.create(dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import a framework definition' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async importFramework(@Body() dto: ImportFrameworkDto) {
    return this.exportService.import(dto);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export a framework definition' })
  async exportFramework(@Param('id') id: string) {
    return this.exportService.export(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a framework' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateFrameworkDto) {
    return this.frameworkService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a framework' })
  async delete(@Param('id') id: string) {
    return this.frameworkService.delete(id);
  }

  @Get(':id/controls')
  @ApiOperation({ summary: 'List controls for a framework' })
  async getControls(@Param('id') id: string) {
    return this.frameworkService.getControls(id);
  }

  @Get(':id/policies')
  @ApiOperation({ summary: 'List policy templates for a framework' })
  async getPolicies(@Param('id') id: string) {
    return this.frameworkService.getPolicies(id);
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'List task templates for a framework' })
  async getTasks(@Param('id') id: string) {
    return this.frameworkService.getTasks(id);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List documents for a framework' })
  async getDocuments(@Param('id') id: string) {
    return this.frameworkService.getDocuments(id);
  }

  @Post(':id/link-control/:controlId')
  @ApiOperation({ summary: 'Link a control to a framework' })
  async linkControl(
    @Param('id') id: string,
    @Param('controlId') controlId: string,
  ) {
    return this.frameworkService.linkControl(id, controlId);
  }

  @Post(':id/link-task/:taskId')
  @ApiOperation({ summary: 'Link a task template to a framework' })
  async linkTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    return this.frameworkService.linkTask(id, taskId);
  }

  @Post(':id/link-policy/:policyId')
  @ApiOperation({ summary: 'Link a policy template to a framework' })
  async linkPolicy(
    @Param('id') id: string,
    @Param('policyId') policyId: string,
  ) {
    return this.frameworkService.linkPolicy(id, policyId);
  }
}

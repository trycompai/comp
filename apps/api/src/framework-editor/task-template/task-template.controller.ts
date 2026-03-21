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
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';
import { UpdateTaskTemplateDto } from './dto/update-task-template.dto';
import { TaskTemplateService } from './task-template.service';
import { ValidateIdPipe } from './pipes/validate-id.pipe';
import { TASK_TEMPLATE_OPERATIONS } from './schemas/task-template-operations';
import { TASK_TEMPLATE_PARAMS } from './schemas/task-template-params';
import { TASK_TEMPLATE_BODIES } from './schemas/task-template-bodies';
import { GET_ALL_TASK_TEMPLATES_RESPONSES } from './schemas/get-all-task-templates.responses';
import { GET_TASK_TEMPLATE_BY_ID_RESPONSES } from './schemas/get-task-template-by-id.responses';
import { UPDATE_TASK_TEMPLATE_RESPONSES } from './schemas/update-task-template.responses';
import { DELETE_TASK_TEMPLATE_RESPONSES } from './schemas/delete-task-template.responses';

@ApiTags('Framework Editor Task Templates')
@Controller({ path: 'framework-editor/task-template', version: '1' })
@UseGuards(PlatformAdminGuard)
export class TaskTemplateController {
  constructor(private readonly taskTemplateService: TaskTemplateService) {}

  @Post()
  @ApiOperation(TASK_TEMPLATE_OPERATIONS.createTaskTemplate)
  @ApiBody(TASK_TEMPLATE_BODIES.createTaskTemplate)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createTaskTemplate(
    @Body() dto: CreateTaskTemplateDto,
    @Query('frameworkId') frameworkId?: string,
  ) {
    return this.taskTemplateService.create(dto, frameworkId);
  }

  @Get()
  @ApiOperation(TASK_TEMPLATE_OPERATIONS.getAllTaskTemplates)
  @ApiResponse(GET_ALL_TASK_TEMPLATES_RESPONSES[200])
  @ApiResponse(GET_ALL_TASK_TEMPLATES_RESPONSES[401])
  @ApiResponse(GET_ALL_TASK_TEMPLATES_RESPONSES[500])
  async getAllTaskTemplates(
    @Query('frameworkId') frameworkId?: string,
  ) {
    return await this.taskTemplateService.findAll(frameworkId);
  }

  @Get(':id')
  @ApiOperation(TASK_TEMPLATE_OPERATIONS.getTaskTemplateById)
  @ApiParam(TASK_TEMPLATE_PARAMS.taskTemplateId)
  @ApiResponse(GET_TASK_TEMPLATE_BY_ID_RESPONSES[200])
  @ApiResponse(GET_TASK_TEMPLATE_BY_ID_RESPONSES[401])
  @ApiResponse(GET_TASK_TEMPLATE_BY_ID_RESPONSES[404])
  @ApiResponse(GET_TASK_TEMPLATE_BY_ID_RESPONSES[500])
  async getTaskTemplateById(
    @Param('id', ValidateIdPipe) taskTemplateId: string,
  ) {
    return await this.taskTemplateService.findById(taskTemplateId);
  }

  @Patch(':id')
  @ApiOperation(TASK_TEMPLATE_OPERATIONS.updateTaskTemplate)
  @ApiParam(TASK_TEMPLATE_PARAMS.taskTemplateId)
  @ApiBody(TASK_TEMPLATE_BODIES.updateTaskTemplate)
  @ApiResponse(UPDATE_TASK_TEMPLATE_RESPONSES[200])
  @ApiResponse(UPDATE_TASK_TEMPLATE_RESPONSES[400])
  @ApiResponse(UPDATE_TASK_TEMPLATE_RESPONSES[401])
  @ApiResponse(UPDATE_TASK_TEMPLATE_RESPONSES[404])
  @ApiResponse(UPDATE_TASK_TEMPLATE_RESPONSES[500])
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async updateTaskTemplate(
    @Param('id', ValidateIdPipe) taskTemplateId: string,
    @Body() updateTaskTemplateDto: UpdateTaskTemplateDto,
  ) {
    return await this.taskTemplateService.updateById(
      taskTemplateId,
      updateTaskTemplateDto,
    );
  }

  @Delete(':id')
  @ApiOperation(TASK_TEMPLATE_OPERATIONS.deleteTaskTemplate)
  @ApiParam(TASK_TEMPLATE_PARAMS.taskTemplateId)
  @ApiResponse(DELETE_TASK_TEMPLATE_RESPONSES[200])
  @ApiResponse(DELETE_TASK_TEMPLATE_RESPONSES[401])
  @ApiResponse(DELETE_TASK_TEMPLATE_RESPONSES[404])
  @ApiResponse(DELETE_TASK_TEMPLATE_RESPONSES[500])
  async deleteTaskTemplate(
    @Param('id', ValidateIdPipe) taskTemplateId: string,
  ) {
    return await this.taskTemplateService.deleteById(taskTemplateId);
  }
}

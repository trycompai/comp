import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthContext } from '../../auth/auth-context.decorator';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import type { AuthContext as AuthContextType } from '../../auth/types';
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
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class TaskTemplateController {
  constructor(private readonly taskTemplateService: TaskTemplateService) {}

  @Get()
  @ApiOperation(TASK_TEMPLATE_OPERATIONS.getAllTaskTemplates)
  @ApiResponse(GET_ALL_TASK_TEMPLATES_RESPONSES[200])
  @ApiResponse(GET_ALL_TASK_TEMPLATES_RESPONSES[401])
  @ApiResponse(GET_ALL_TASK_TEMPLATES_RESPONSES[500])
  async getAllTaskTemplates() {
    return await this.taskTemplateService.findAll();
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
    @AuthContext() authContext: AuthContextType,
  ) {
    const taskTemplate =
      await this.taskTemplateService.findById(taskTemplateId);

    return {
      ...taskTemplate,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
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
    @AuthContext() authContext: AuthContextType,
  ) {
    const updatedTaskTemplate = await this.taskTemplateService.updateById(
      taskTemplateId,
      updateTaskTemplateDto,
    );

    return {
      ...updatedTaskTemplate,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
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
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.taskTemplateService.deleteById(taskTemplateId);

    return {
      ...result,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }
}

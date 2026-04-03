import { CreateTaskTemplateDto } from '../dto/create-task-template.dto';
import { UpdateTaskTemplateDto } from '../dto/update-task-template.dto';

export const TASK_TEMPLATE_BODIES = {
  createTaskTemplate: {
    type: CreateTaskTemplateDto,
    description: 'Create a new framework editor task template',
  },
  updateTaskTemplate: {
    type: UpdateTaskTemplateDto,
    description: 'Update framework editor task template data',
  },
};

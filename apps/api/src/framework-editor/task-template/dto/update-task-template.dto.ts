import { PartialType } from '@nestjs/swagger';
import { CreateTaskTemplateDto } from './create-task-template.dto';

export class UpdateTaskTemplateDto extends PartialType(CreateTaskTemplateDto) {}

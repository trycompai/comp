import { PartialType } from '@nestjs/swagger';
import { CreateFrameworkEditorTaskTemplateDto } from './create-framework-editor-task-template.dto';

export class UpdateFrameworkEditorTaskTemplateDto extends PartialType(CreateFrameworkEditorTaskTemplateDto) {}


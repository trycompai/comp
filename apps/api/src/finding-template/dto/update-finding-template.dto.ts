import { PartialType } from '@nestjs/swagger';
import { CreateFindingTemplateDto } from './create-finding-template.dto';

export class UpdateFindingTemplateDto extends PartialType(
  CreateFindingTemplateDto,
) {}

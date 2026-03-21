import { PartialType } from '@nestjs/swagger';
import { CreateControlTemplateDto } from './create-control-template.dto';

export class UpdateControlTemplateDto extends PartialType(
  CreateControlTemplateDto,
) {}

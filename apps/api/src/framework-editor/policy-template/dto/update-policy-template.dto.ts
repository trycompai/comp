import { PartialType } from '@nestjs/swagger';
import { CreatePolicyTemplateDto } from './create-policy-template.dto';

export class UpdatePolicyTemplateDto extends PartialType(
  CreatePolicyTemplateDto,
) {}

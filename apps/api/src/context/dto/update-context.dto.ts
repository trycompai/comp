import { PartialType } from '@nestjs/swagger';
import { CreateContextDto } from './create-context.dto';

export class UpdateContextDto extends PartialType(CreateContextDto) {}

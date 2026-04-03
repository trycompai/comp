import { PartialType } from '@nestjs/swagger';
import { CreateFrameworkDto } from './create-framework.dto';

export class UpdateFrameworkDto extends PartialType(CreateFrameworkDto) {}

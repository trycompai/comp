import { PartialType } from '@nestjs/swagger';
import { CreateRiskDto } from './create-risk.dto';

export class UpdateRiskDto extends PartialType(CreateRiskDto) {}

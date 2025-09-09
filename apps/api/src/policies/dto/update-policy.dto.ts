import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreatePolicyDto } from './create-policy.dto';

export class UpdatePolicyDto extends PartialType(CreatePolicyDto) {
  @ApiProperty({
    description: 'Whether to archive this policy',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

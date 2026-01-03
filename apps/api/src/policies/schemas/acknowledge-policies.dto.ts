import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AcknowledgePoliciesDto {
  @ApiProperty({
    description: 'Policy IDs to acknowledge for the current user',
    example: ['pol_abc123', 'pol_def456'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  policyIds!: string[];
}

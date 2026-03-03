import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class BulkDeletePoliciesDto {
  @ApiProperty({
    description: 'Array of policy IDs to delete',
    example: ['policy_abc123', 'policy_def456'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  policyIds: string[];
}

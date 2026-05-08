import { ArrayMinSize, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkPoliciesDto {
  @ApiProperty({ description: 'Policy IDs to link to the control', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  policyIds: string[];
}

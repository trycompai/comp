import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';
import { MaxJsonSize } from '../../validators/max-json-size.validator';

export class UpdatePolicyContentDto {
  @ApiProperty({ description: 'TipTap JSON content for the policy document' })
  @IsNotEmpty()
  @IsObject()
  @MaxJsonSize()
  content: Record<string, unknown>;
}

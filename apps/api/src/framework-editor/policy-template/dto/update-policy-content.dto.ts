import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';

export class UpdatePolicyContentDto {
  @ApiProperty({ description: 'TipTap JSON content for the policy document' })
  @IsNotEmpty()
  @IsObject()
  content: Record<string, unknown>;
}

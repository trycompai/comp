import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GenerateAllDto {
  @ApiProperty({
    description:
      'ID of the framework to generate all ISMS profile documents for',
    example: 'frk_abc123def456',
  })
  @IsString()
  frameworkId!: string;
}

import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Framework ID this template belongs to' })
  @IsString()
  @IsNotEmpty()
  frameworkId: string;

  @ApiProperty({
    description: 'Template name',
    example: 'SOC 2 Initial Audit',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Cycle number (1 = initial, 2+ = renewal)',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  cycleNumber: number;
}

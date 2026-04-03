import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateAutomationDto {
  @ApiProperty({
    description: 'Automation name',
    example: 'GitHub Security Check - Evidence Collection',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Automation description',
    example: 'Collects evidence about GitHub repository security settings',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the automation is enabled',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiProperty({
    description: 'Evaluation criteria for the automation',
    required: false,
  })
  @IsString()
  @IsOptional()
  evaluationCriteria?: string;
}

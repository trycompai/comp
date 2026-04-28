import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { TaskFrequency } from '@db';

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

  @ApiPropertyOptional({
    enum: TaskFrequency,
    description: 'Automation schedule cadence',
  })
  @IsEnum(TaskFrequency)
  @IsOptional()
  scheduleFrequency?: TaskFrequency;
}

import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePenetrationTestDto {
  @ApiProperty({
    description: 'Target URL for the penetration test scan',
    example: 'https://app.example.com',
  })
  @IsUrl()
  targetUrl!: string;

  @ApiProperty({
    description: 'Repository URL containing the target application code',
    example: 'https://github.com/org/repo',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  repoUrl?: string;

  @ApiPropertyOptional({
    description: 'GitHub token used for cloning private repositories',
    required: false,
  })
  @IsOptional()
  @IsString()
  githubToken?: string;

  @ApiPropertyOptional({
    description: 'Optional YAML configuration for the pentest run',
    required: false,
  })
  @IsOptional()
  @IsString()
  configYaml?: string;

  @ApiPropertyOptional({
    description: 'Whether to enable pipeline testing mode',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  pipelineTesting?: boolean;

  @ApiPropertyOptional({
    description: 'Workspace identifier used by the pentest engine',
    required: false,
  })
  @IsOptional()
  @IsString()
  workspace?: string;

  @ApiPropertyOptional({
    description: 'Optional webhook URL to notify when report generation completes',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether to run the pentest in simulation mode',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  testMode?: boolean;
}

import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const scanDepthValues = ['quick', 'standard', 'deep'] as const;
export type ScanDepth = (typeof scanDepthValues)[number];

export const evidenceLevelValues = [
  'report_only',
  'safe_proof',
  'impact_proof',
] as const;
export type EvidenceLevel = (typeof evidenceLevelValues)[number];

export const pentestCheckValues = [
  'discovery',
  'secrets_info_disclosure',
  'technology_config',
  'xss',
  'injection',
  'authentication',
  'authorization',
  'idor_bola',
  'ssrf_xxe',
  'csrf',
  'race_conditions',
  'business_logic',
] as const;
export type PentestCheck = (typeof pentestCheckValues)[number];

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
    description: 'Whether to enable pipeline testing mode',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  pipelineTesting?: boolean;

  @ApiPropertyOptional({
    description:
      'Optional webhook URL to notify when report generation completes',
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

  @ApiPropertyOptional({
    description: 'Scan depth profile to run',
    enum: scanDepthValues,
    required: false,
  })
  @IsOptional()
  @IsEnum(scanDepthValues)
  scanDepth?: ScanDepth;

  @ApiPropertyOptional({
    description: 'Evidence validation level for findings',
    enum: evidenceLevelValues,
    required: false,
  })
  @IsOptional()
  @IsEnum(evidenceLevelValues)
  evidenceLevel?: EvidenceLevel;

  @ApiPropertyOptional({
    description: 'Maced check IDs to include in the scan',
    enum: pentestCheckValues,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(pentestCheckValues, { each: true })
  checks?: PentestCheck[];
}

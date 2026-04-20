import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsIn,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { FindingArea, FindingSeverity, FindingType } from '@db';
import {
  evidenceFormTypeSchema,
  type EvidenceFormType,
} from '@/evidence-forms/evidence-forms.definitions';

export class CreateFindingDto {
  @ApiProperty({ description: 'Task ID', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  taskId?: string;

  @ApiProperty({ description: 'Evidence submission ID', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  evidenceSubmissionId?: string;

  @ApiProperty({
    description: 'Evidence form type',
    enum: evidenceFormTypeSchema.options,
    required: false,
  })
  @IsIn(evidenceFormTypeSchema.options)
  @IsOptional()
  evidenceFormType?: EvidenceFormType;

  @ApiProperty({ description: 'Policy ID', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  policyId?: string;

  @ApiProperty({ description: 'Vendor ID', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  vendorId?: string;

  @ApiProperty({ description: 'Risk ID', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  riskId?: string;

  @ApiProperty({ description: 'Member ID (person this finding targets)', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  memberId?: string;

  @ApiProperty({ description: 'Device ID', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  deviceId?: string;

  @ApiProperty({
    description: 'Broad area when the finding is not tied to a specific item',
    enum: FindingArea,
    required: false,
  })
  // Use an explicit string list instead of @IsEnum(FindingArea). The Prisma-
  // generated enum is captured at decorator-eval time, so a dev server started
  // before `prisma generate` picked up new enum values will keep rejecting
  // them (e.g. "area must be one of the following values: people, documents,
  // compliance" even though `risks`/`vendors`/`policies` are now valid).
  @IsIn(['people', 'documents', 'compliance', 'risks', 'vendors', 'policies', 'other'])
  @IsOptional()
  area?: FindingArea;

  @ApiProperty({
    description: 'Type of finding (SOC 2 or ISO 27001)',
    enum: FindingType,
    default: FindingType.soc2,
  })
  @IsEnum(FindingType)
  @IsOptional()
  type?: FindingType;

  @ApiProperty({
    description: 'Severity',
    enum: FindingSeverity,
    default: FindingSeverity.medium,
    required: false,
  })
  @IsEnum(FindingSeverity)
  @IsOptional()
  severity?: FindingSeverity;

  @ApiProperty({ description: 'Finding template ID', required: false })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  templateId?: string;

  @ApiProperty({ description: 'Finding content/message', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}

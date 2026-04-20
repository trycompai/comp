import { EvidenceFormType } from '@db';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RequirementMappingDto {
  @ApiProperty({
    description:
      'Platform requirement ID (exactly one of requirementId / customRequirementId must be set)',
    required: false,
  })
  @IsOptional()
  @IsString()
  requirementId?: string;

  @ApiProperty({
    description:
      'Org-custom requirement ID (exactly one of requirementId / customRequirementId must be set)',
    required: false,
  })
  @IsOptional()
  @IsString()
  customRequirementId?: string;

  @ApiProperty({ description: 'Framework instance ID' })
  @IsString()
  frameworkInstanceId: string;
}

export class CreateControlDto {
  @ApiProperty({ description: 'Control name', example: 'Access Control' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Control description',
    example: 'Manages user access to systems',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Policy IDs to connect',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  policyIds?: string[];

  @ApiProperty({
    description: 'Task IDs to connect',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taskIds?: string[];

  @ApiProperty({
    description: 'Requirement mappings',
    required: false,
    type: [RequirementMappingDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequirementMappingDto)
  requirementMappings?: RequirementMappingDto[];

  @ApiProperty({
    description: 'Evidence form types to require on this control',
    required: false,
    enum: EvidenceFormType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(EvidenceFormType, { each: true })
  documentTypes?: EvidenceFormType[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsArray,
  IsInt,
  IsEnum,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
  Min,
} from 'class-validator';
import {
  EvidenceFormType,
  Frequency,
  Departments,
  TaskAutomationStatus,
} from '@db';
import { MaxJsonSize } from '../../validators/max-json-size.validator';
import { IsObjectOrArray } from '../../validators/is-object-or-array.validator';

class ImportFrameworkMetaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  visible?: boolean;
}

class ImportRequirementDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  identifier?: string;

  // Matches the standalone requirement DTOs (FRAME-2). NIST SP800-53 control
  // text routinely exceeds 5000 chars (e.g. PL-2 > 6000).
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  description: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  requirementFamily?: string;
}

class ImportControlTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  description: string;

  @ApiPropertyOptional({ example: 'AC - Access Control' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  controlFamily?: string;

  @ApiPropertyOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsEnum(EvidenceFormType, { each: true })
  @IsOptional()
  documentTypes?: EvidenceFormType[];

  @ApiPropertyOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @IsOptional()
  requirementIndices?: number[];

  @ApiPropertyOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @IsOptional()
  policyTemplateIndices?: number[];

  @ApiPropertyOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @IsOptional()
  taskTemplateIndices?: number[];
}

class ImportPolicyTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  description: string;

  @ApiProperty()
  @IsEnum(Frequency)
  frequency: Frequency;

  @ApiProperty()
  @IsEnum(Departments)
  department: Departments;

  // TipTap content is stored either as a `{ type: 'doc', … }` object or a bare
  // node array (legacy data) — accept both; it's normalized on persist.
  @ApiPropertyOptional()
  @IsObjectOrArray()
  @IsOptional()
  @MaxJsonSize()
  content?: Record<string, unknown> | unknown[];
}

class ImportTaskTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  description: string;

  @ApiProperty()
  @IsEnum(Frequency)
  frequency: Frequency;

  @ApiProperty()
  @IsEnum(Departments)
  department: Departments;

  @ApiPropertyOptional()
  @IsEnum(TaskAutomationStatus)
  @IsOptional()
  automationStatus?: TaskAutomationStatus;
}

export class ImportFrameworkDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  version: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  exportedAt?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ImportFrameworkMetaDto)
  framework: ImportFrameworkMetaDto;

  @ApiPropertyOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ImportRequirementDto)
  @IsOptional()
  requirements?: ImportRequirementDto[];

  @ApiPropertyOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ImportControlTemplateDto)
  @IsOptional()
  controlTemplates?: ImportControlTemplateDto[];

  @ApiPropertyOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ImportPolicyTemplateDto)
  @IsOptional()
  policyTemplates?: ImportPolicyTemplateDto[];

  @ApiPropertyOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ImportTaskTemplateDto)
  @IsOptional()
  taskTemplates?: ImportTaskTemplateDto[];
}

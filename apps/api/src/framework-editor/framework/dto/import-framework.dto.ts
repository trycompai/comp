import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsArray,
  IsInt,
  IsObject,
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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;
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
  @MaxLength(5000)
  description: string;

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
  @MaxLength(5000)
  description: string;

  @ApiProperty()
  @IsEnum(Frequency)
  frequency: Frequency;

  @ApiProperty()
  @IsEnum(Departments)
  department: Departments;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  @MaxJsonSize()
  content?: Record<string, unknown>;
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
  @MaxLength(5000)
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

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class BatchUpdateRequirementItem {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  identifier?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  description?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  requirementFamily?: string;
}

export class BatchUpdateRequirementsDto {
  @ApiProperty({ type: [BatchUpdateRequirementItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchUpdateRequirementItem)
  updates: BatchUpdateRequirementItem[];
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  IsOptional,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class BatchUpdateRequirementItem {
  @ApiProperty()
  @IsString()
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
  @MaxLength(5000)
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

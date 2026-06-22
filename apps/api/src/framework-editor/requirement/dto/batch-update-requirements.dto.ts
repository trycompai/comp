import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  Min,
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

  // Nullable so a batch update can clear an order back to "unset".
  @ApiProperty({ required: false, nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number | null;
}

export class BatchUpdateRequirementsDto {
  @ApiProperty({ type: [BatchUpdateRequirementItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchUpdateRequirementItem)
  updates: BatchUpdateRequirementItem[];
}

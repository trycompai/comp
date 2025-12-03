import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AnswerSourceDto {
  @IsString()
  sourceType!: string;

  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  policyName?: string;

  @IsOptional()
  @IsString()
  documentName?: string;

  @IsOptional()
  @IsInt()
  score?: number;
}

export class SaveAnswerDto {
  @IsString()
  questionnaireId!: string;

  @IsString()
  organizationId!: string;

  @IsOptional()
  @IsString()
  questionAnswerId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  questionIndex?: number;

  @IsOptional()
  @IsString()
  answer?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerSourceDto)
  sources?: AnswerSourceDto[];

  @IsIn(['generated', 'manual'])
  status!: 'generated' | 'manual';
}

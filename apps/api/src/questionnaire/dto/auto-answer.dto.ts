import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class AutoAnswerQuestionDto {
  @IsString()
  question!: string;

  @IsOptional()
  @IsString()
  answer?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  _originalIndex?: number;
}

export class AutoAnswerDto {
  @IsString()
  organizationId!: string;

  @IsOptional()
  @IsString()
  questionnaireId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutoAnswerQuestionDto)
  questionsAndAnswers!: AutoAnswerQuestionDto[];
}

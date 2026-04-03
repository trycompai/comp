import { IsString, IsOptional, IsArray } from 'class-validator';

export class SaveManualAnswerDto {
  @IsString()
  question!: string;

  @IsString()
  answer!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  sourceQuestionnaireId?: string;
}

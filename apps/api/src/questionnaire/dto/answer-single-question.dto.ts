import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AnswerSingleQuestionDto {
  @IsString()
  question!: string;

  @IsInt()
  @Min(0)
  questionIndex!: number;

  @IsInt()
  @Min(1)
  totalQuestions!: number;

  @IsString()
  organizationId!: string;

  @IsOptional()
  @IsString()
  questionnaireId?: string;
}

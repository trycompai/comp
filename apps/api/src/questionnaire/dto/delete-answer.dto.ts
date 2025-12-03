import { IsString } from 'class-validator';

export class DeleteAnswerDto {
  @IsString()
  questionnaireId!: string;

  @IsString()
  organizationId!: string;

  @IsString()
  questionAnswerId!: string;
}

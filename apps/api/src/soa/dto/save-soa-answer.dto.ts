import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SaveSOAAnswerDto {
  @IsString()
  organizationId!: string;

  @IsString()
  documentId!: string;

  @IsString()
  questionId!: string;

  @IsOptional()
  @IsString()
  answer?: string | null;

  @IsOptional()
  @IsBoolean()
  isApplicable?: boolean | null;

  @IsOptional()
  @IsString()
  justification?: string | null;
}

import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { ParseQuestionnaireDto } from './parse-questionnaire.dto';

export type QuestionnaireExportFormat = 'pdf' | 'csv' | 'xlsx';

export class ExportQuestionnaireDto extends ParseQuestionnaireDto {
  @IsString()
  organizationId!: string;

  @IsIn(['pdf', 'csv', 'xlsx'])
  format!: QuestionnaireExportFormat;

  @IsOptional()
  @IsIn(['internal', 'external'])
  source?: 'internal' | 'external';

  @IsOptional()
  @IsBoolean()
  exportInAllExtensions?: boolean;
}

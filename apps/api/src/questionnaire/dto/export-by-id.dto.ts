import { IsIn, IsString } from 'class-validator';

export class ExportByIdDto {
  @IsString()
  questionnaireId!: string;

  @IsString()
  organizationId!: string;

  @IsIn(['xlsx', 'csv', 'pdf'])
  format!: 'xlsx' | 'csv' | 'pdf';
}

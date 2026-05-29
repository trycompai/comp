import { IsIn } from 'class-validator';

export class ExportIsmsDocumentDto {
  @IsIn(['pdf', 'docx'])
  format!: 'pdf' | 'docx';
}

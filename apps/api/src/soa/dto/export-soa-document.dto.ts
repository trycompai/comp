import { IsIn, IsString } from 'class-validator';

export class ExportSOADocumentDto {
  @IsString()
  documentId!: string;

  @IsString()
  organizationId!: string;

  @IsIn(['pdf'])
  format!: 'pdf';
}


import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ExportSOADocumentDto {
  @IsString()
  @IsNotEmpty()
  documentId!: string;

  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsIn(['pdf'])
  format!: 'pdf';
}


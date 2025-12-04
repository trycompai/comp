import { IsString } from 'class-validator';

export class ApproveSOADocumentDto {
  @IsString()
  organizationId!: string;

  @IsString()
  documentId!: string;
}

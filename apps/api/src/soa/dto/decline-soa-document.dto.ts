import { IsString } from 'class-validator';

export class DeclineSOADocumentDto {
  @IsString()
  organizationId!: string;

  @IsString()
  documentId!: string;
}

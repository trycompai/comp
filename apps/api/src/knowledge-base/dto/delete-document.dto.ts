import { IsString } from 'class-validator';

export class DeleteDocumentDto {
  @IsString()
  organizationId!: string;

  @IsString()
  documentId!: string;
}

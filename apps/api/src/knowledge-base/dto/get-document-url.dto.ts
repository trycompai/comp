import { IsString } from 'class-validator';

export class GetDocumentUrlDto {
  @IsString()
  organizationId!: string;

  @IsString()
  documentId!: string;
}

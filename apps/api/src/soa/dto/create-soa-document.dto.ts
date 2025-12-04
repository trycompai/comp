import { IsString } from 'class-validator';

export class CreateSOADocumentDto {
  @IsString()
  organizationId!: string;

  @IsString()
  frameworkId!: string;
}

import { IsString } from 'class-validator';

export class AutoFillSOADto {
  @IsString()
  organizationId!: string;

  @IsString()
  documentId!: string;
}

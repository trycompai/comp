import { IsOptional, IsString } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  organizationId!: string;

  @IsString()
  fileName!: string;

  @IsString()
  fileType!: string;

  @IsString()
  fileData!: string; // base64 encoded

  @IsOptional()
  @IsString()
  description?: string;
}

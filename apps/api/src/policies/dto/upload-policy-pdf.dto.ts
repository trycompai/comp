import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadPolicyPdfDto {
  @IsOptional()
  @IsString()
  versionId?: string;

  @IsNotEmpty()
  @IsString()
  fileName!: string;

  @IsNotEmpty()
  @IsString()
  fileType!: string;

  @IsNotEmpty()
  @IsString()
  fileData!: string; // Base64 encoded file content
}

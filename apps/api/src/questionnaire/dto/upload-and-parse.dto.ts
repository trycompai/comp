import { IsIn, IsOptional, IsString } from 'class-validator';

export class UploadAndParseDto {
  @IsString()
  organizationId!: string;

  @IsString()
  fileName!: string;

  @IsString()
  fileType!: string;

  @IsString()
  fileData!: string; // base64 encoded

  @IsOptional()
  @IsIn(['internal', 'external'])
  source?: 'internal' | 'external';
}

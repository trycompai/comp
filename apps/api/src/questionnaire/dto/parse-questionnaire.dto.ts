import { IsOptional, IsString } from 'class-validator';

export class ParseQuestionnaireDto {
  @IsString()
  fileData!: string; // base64 encoded content

  @IsString()
  fileType!: string; // MIME type

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  vendorName?: string;
}

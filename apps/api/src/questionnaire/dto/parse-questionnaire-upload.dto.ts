import { IsOptional, IsString } from 'class-validator';

export class ParseQuestionnaireUploadDto {
  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}

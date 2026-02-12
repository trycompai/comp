import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBase64,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UploadPolicyPdfDto {
  @ApiProperty({
    description: 'Name of the PDF file',
    example: 'policy.pdf',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^application\/pdf$/i, {
    message: 'Only application/pdf is supported',
  })
  fileType: string;

  @ApiProperty({
    description: 'Base64 encoded PDF data',
    example: 'JVBERi0xLjQKJaqrrK0KNCAwIG9iago8PC9UeXBlL0NhdGFsb2c+',
  })
  @IsString()
  @IsNotEmpty()
  @IsBase64()
  fileData: string;
}

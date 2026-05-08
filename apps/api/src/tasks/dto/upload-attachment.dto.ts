import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBase64,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsMimeTypeField } from '../../utils/mime-type.validator';

export class UploadAttachmentDto {
  @ApiProperty({
    description: 'Name of the file',
    example: 'document.pdf',
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
  @IsMimeTypeField()
  fileType: string;

  @ApiProperty({
    description: 'Base64 encoded file data',
    example:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  })
  @IsString()
  @IsNotEmpty()
  @IsBase64()
  fileData: string;

  @ApiProperty({
    description: 'Description of the attachment',
    example: 'Meeting notes from Q4 planning session',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

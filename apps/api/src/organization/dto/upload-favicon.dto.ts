import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UploadFaviconDto {
  @ApiProperty({
    description: 'File name of the favicon',
    example: 'favicon.png',
  })
  @IsString()
  fileName!: string;

  @ApiProperty({
    description: 'MIME type of the favicon',
    example: 'image/png',
    enum: [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/x-icon',
      'image/vnd.microsoft.icon',
      'image/svg+xml',
    ],
  })
  @IsString()
  fileType!: string;

  @ApiProperty({
    description: 'Base64 encoded file data',
    example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  })
  @IsString()
  fileData!: string;
}

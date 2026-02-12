import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadOrgChartDto {
  @ApiProperty({ description: 'Original file name' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ description: 'MIME type of the file (e.g. image/png)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9\-]+\/[a-zA-Z0-9\-\+\.]+$/, {
    message: 'Invalid MIME type format',
  })
  fileType: string;

  @ApiProperty({ description: 'Base64-encoded file data' })
  @IsString()
  @IsNotEmpty()
  fileData: string;
}

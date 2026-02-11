import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadOrgChartDto {
  @ApiProperty({ description: 'Original file name' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'MIME type of the file (e.g. image/png)' })
  @IsString()
  fileType: string;

  @ApiProperty({ description: 'Base64-encoded file data' })
  @IsString()
  fileData: string;
}

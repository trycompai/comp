import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsMimeTypeField } from '../../utils/mime-type.validator';

export class UploadOrgChartDto {
  @ApiProperty({ description: 'Original file name' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ description: 'MIME type of the file (e.g. image/png)' })
  @IsMimeTypeField()
  fileType: string;

  @ApiProperty({ description: 'Base64-encoded file data' })
  @IsString()
  @IsNotEmpty()
  fileData: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class BulkUploadFileEntryDto {
  @ApiProperty({
    description: 'Original file name',
    example: 'data-privacy-policy.pdf',
  })
  @IsString()
  @MinLength(1)
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  @IsString()
  @MinLength(1)
  fileType: string;

  @ApiProperty({
    description: 'Base64-encoded file content',
  })
  @IsString()
  @MinLength(1)
  fileData: string;
}

export class BulkUploadPoliciesDto {
  @ApiProperty({
    description: 'Array of files to upload as policies',
    type: [BulkUploadFileEntryDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BulkUploadFileEntryDto)
  files: BulkUploadFileEntryDto[];
}

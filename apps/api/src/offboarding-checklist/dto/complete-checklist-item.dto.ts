import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsBase64 } from 'class-validator';
import { IsMimeTypeField } from '../../utils/mime-type.validator';

export class CompleteChecklistItemDto {
  @ApiProperty({ description: 'Optional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Evidence file name', required: false })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({ description: 'Evidence file MIME type', required: false })
  @IsOptional()
  @IsMimeTypeField()
  fileType?: string;

  @ApiProperty({
    description: 'Base64 encoded evidence file',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(134_217_728)
  @IsBase64()
  fileData?: string;
}

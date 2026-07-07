import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ExportIsmsDocumentDto {
  @ApiProperty({
    description: 'File format to export the ISMS document as',
    enum: ['pdf', 'docx'],
    example: 'pdf',
  })
  @IsIn(['pdf', 'docx'])
  format!: 'pdf' | 'docx';

  @ApiPropertyOptional({
    description:
      'Published version to export. Omit to export the current working draft; ' +
      'provide a version id to download exactly what was approved at that version.',
  })
  @IsOptional()
  @IsString()
  versionId?: string;
}

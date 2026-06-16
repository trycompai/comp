import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ExportIsmsDocumentDto {
  @ApiProperty({
    description: 'File format to export the ISMS document as',
    enum: ['pdf', 'docx'],
    example: 'pdf',
  })
  @IsIn(['pdf', 'docx'])
  format!: 'pdf' | 'docx';
}

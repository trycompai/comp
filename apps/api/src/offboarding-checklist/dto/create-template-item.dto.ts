import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateTemplateItemDto {
  @ApiProperty({
    description: 'Checklist item title',
    example: 'Collect access badges',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Guidance text for the admin', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Whether evidence upload is required',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  evidenceRequired?: boolean;
}

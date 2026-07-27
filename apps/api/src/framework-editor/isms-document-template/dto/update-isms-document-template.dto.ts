import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateIsmsDocumentTemplateDto {
  @ApiPropertyOptional({ example: 'Context of the Organization' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: 'Internal and external issues relevant to the ISMS.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: '4.1' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  clause?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}

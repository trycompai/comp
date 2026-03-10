import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class EmailAttachmentDto {
  @ApiProperty()
  @IsString()
  filename: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentType?: string;
}

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email address' })
  @IsString()
  to: string;

  @ApiProperty({ description: 'Email subject line' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Pre-rendered HTML content' })
  @IsString()
  html: string;

  @ApiPropertyOptional({ description: 'Explicit FROM address override' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Use system sender address (RESEND_FROM_SYSTEM)',
  })
  @IsOptional()
  @IsBoolean()
  system?: boolean;

  @ApiPropertyOptional({ description: 'CC recipients' })
  @IsOptional()
  cc?: string | string[];

  @ApiPropertyOptional({ description: 'Schedule email for later delivery' })
  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'File attachments' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  attachments?: EmailAttachmentDto[];
}

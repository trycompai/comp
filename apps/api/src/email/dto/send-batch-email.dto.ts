import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BatchEmailItemDto {
  @ApiProperty({ description: 'Recipient email address' })
  @IsEmail()
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

  @ApiPropertyOptional({ description: 'CC recipients' })
  @IsOptional()
  cc?: string | string[];
}

export class SendBatchEmailDto {
  @ApiProperty({
    description: 'Array of emails to send',
    type: [BatchEmailItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchEmailItemDto)
  emails: BatchEmailItemDto[];
}

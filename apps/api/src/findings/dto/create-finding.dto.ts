import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { FindingType } from '@trycompai/db';

export class CreateFindingDto {
  @ApiProperty({
    description: 'Task ID this finding is associated with',
    example: 'tsk_abc123',
  })
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({
    description: 'Type of finding (SOC 2 or ISO 27001)',
    enum: FindingType,
    default: FindingType.soc2,
  })
  @IsEnum(FindingType)
  @IsOptional()
  type?: FindingType;

  @ApiProperty({
    description: 'Finding template ID (optional)',
    example: 'fnd_t_abc123',
    required: false,
  })
  @IsString()
  @IsOptional()
  templateId?: string;

  @ApiProperty({
    description: 'Finding content/message',
    example:
      'The uploaded evidence does not clearly show the Organization Name or URL.',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}

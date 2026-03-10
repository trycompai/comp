import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsEnum } from 'class-validator';
import { CreatePolicyDto } from './create-policy.dto';

export enum DisplayFormat {
  EDITOR = 'EDITOR',
  PDF = 'PDF',
}

export class UpdatePolicyDto extends PartialType(CreatePolicyDto) {
  @ApiProperty({
    description: 'Whether to archive this policy',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiProperty({
    description: 'Display format for this policy',
    enum: DisplayFormat,
    example: DisplayFormat.EDITOR,
    required: false,
  })
  @IsOptional()
  @IsEnum(DisplayFormat)
  displayFormat?: DisplayFormat;
}

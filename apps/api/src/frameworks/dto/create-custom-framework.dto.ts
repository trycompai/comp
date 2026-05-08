import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomFrameworkDto {
  @ApiProperty({ description: 'Framework name', example: 'Internal Controls' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ description: 'Framework description' })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ description: 'Version', required: false, example: '1.0' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  version?: string;
}

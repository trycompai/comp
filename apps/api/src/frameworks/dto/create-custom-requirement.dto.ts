import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomRequirementDto {
  @ApiProperty({ description: 'Requirement name', example: 'Access Review' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Identifier', example: '10.3' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  identifier: string;

  @ApiProperty({ description: 'Description' })
  @IsString()
  @MaxLength(4000)
  description: string;
}

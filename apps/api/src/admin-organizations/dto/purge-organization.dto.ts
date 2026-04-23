import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class PurgeOrganizationDto {
  @ApiProperty({
    description:
      'The target organization slug. Must match exactly to confirm deletion.',
    example: 'acme-corp',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  confirm: string;
}

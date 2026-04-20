import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PurgeOrganizationDto {
  @ApiProperty({
    description:
      'The target organization slug. Must match exactly to confirm deletion.',
    example: 'acme-corp',
  })
  @IsString()
  confirm: string;
}

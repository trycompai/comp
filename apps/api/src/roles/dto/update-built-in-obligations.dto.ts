import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateBuiltInObligationsDto {
  @ApiProperty({
    description: 'Obligations override for the built-in role.',
    example: { compliance: false },
    required: true,
  })
  @IsObject()
  obligations!: { compliance?: boolean } & Record<string, boolean>;
}

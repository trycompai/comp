import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class EnsureIsmsSetupDto {
  @ApiProperty({
    description: 'ID of the framework to scope the ISMS setup to',
    example: 'frk_abc123def456',
  })
  @IsString()
  frameworkId!: string;
}

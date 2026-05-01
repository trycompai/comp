import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetBackgroundCheckStepDto {
  @ApiProperty({
    description:
      'When true, the organization requires background checks for people completion. When false, BG checks are bypassed and excluded from counts.',
    example: false,
  })
  @IsBoolean()
  enabled: boolean;
}

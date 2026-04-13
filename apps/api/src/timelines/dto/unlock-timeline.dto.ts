import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UnlockTimelineDto {
  @ApiProperty({
    description: 'Required reason for unlocking a locked timeline',
    example: 'Audit scope changed; reopening timeline for correction.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  unlockReason: string;
}


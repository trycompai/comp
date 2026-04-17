import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UnlockTimelineDto {
  @ApiProperty({
    description: 'Required reason for unlocking a locked timeline',
    example: 'Audit scope changed; reopening timeline for correction.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  unlockReason: string;
}


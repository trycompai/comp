import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateTimelineDto {
  @ApiProperty({
    description: 'The start date for the timeline',
    example: '2026-05-01T00:00:00.000Z',
  })
  @IsDateString()
  startDate: string;
}

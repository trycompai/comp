import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class LinkIsmsControlsDto {
  @ApiProperty({
    description: 'IDs of the controls to link to the ISMS document',
    type: [String],
    example: ['ctl_abc123def456', 'ctl_ghi789jkl012'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  controlIds!: string[];
}

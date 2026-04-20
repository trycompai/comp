import { ArrayMinSize, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkControlsDto {
  @ApiProperty({
    description:
      'Existing org Control IDs to map to the requirement on this framework instance',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  controlIds: string[];
}

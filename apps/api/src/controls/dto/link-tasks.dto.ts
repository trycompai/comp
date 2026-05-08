import { ArrayMinSize, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkTasksDto {
  @ApiProperty({ description: 'Task IDs to link to the control', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  taskIds: string[];
}

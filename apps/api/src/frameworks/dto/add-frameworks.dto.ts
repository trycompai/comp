import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddFrameworksDto {
  @ApiProperty({
    description: 'Array of framework editor framework IDs to add',
    type: [String],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  frameworkIds: string[];
}

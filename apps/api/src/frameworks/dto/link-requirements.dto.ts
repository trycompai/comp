import { ArrayMinSize, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkRequirementsDto {
  @ApiProperty({
    description:
      'IDs of existing FrameworkEditorRequirement rows to clone into this framework',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  requirementIds: string[];
}

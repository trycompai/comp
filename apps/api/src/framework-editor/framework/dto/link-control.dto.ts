import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class LinkControlDto {
  @ApiPropertyOptional({
    description:
      'Requirement ids (of this framework) to link the control to. ' +
      'Omit to link the control to every requirement in the framework ' +
      '(legacy bulk behavior used by the CLI).',
    type: [String],
    example: ['frk_rq_abc123'],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  requirementIds?: string[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class MoveFrameworksDto {
  @ApiProperty({ type: [String], example: ['frk_abc', 'frk_def'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  frameworkIds: string[];

  // Destination family id. null/omitted moves the frameworks to the root
  // (ungrouped). @IsOptional() lets both null and undefined through.
  @ApiPropertyOptional({
    nullable: true,
    description: 'Destination family id; null or omitted moves to the root.',
  })
  @IsString()
  @IsOptional()
  familyId?: string | null;
}

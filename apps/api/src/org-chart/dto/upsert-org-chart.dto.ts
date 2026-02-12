import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertOrgChartDto {
  @ApiPropertyOptional({ description: 'Name of the org chart' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'React Flow nodes array', type: [Object] })
  @IsArray()
  nodes: any[];

  @ApiProperty({ description: 'React Flow edges array', type: [Object] })
  @IsArray()
  edges: any[];
}

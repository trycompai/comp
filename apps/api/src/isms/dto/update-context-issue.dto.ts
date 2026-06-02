import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { IsmsContextIssueKind } from '@db';

export class UpdateContextIssueDto {
  @IsOptional()
  @IsIn(['internal', 'external'])
  kind?: IsmsContextIssueKind;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  effect?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
